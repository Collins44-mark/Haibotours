import { doc, getDoc } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import {
  ensureAuthReady,
  adminLogout,
  getAdminAuth,
  getAdminDb,
  adminLogin,
} from './admin-firebase.mjs';
import { formatAuthError } from './admin-errors.mjs';

/** Canonical routes (Vercel rewrites) */
export const ADMIN_LOGIN_PATH = '/admin-login';
export const ADMIN_DASHBOARD_PATH = '/admin';

const AUTH_READY_TIMEOUT_MS = 3000;
const ADMIN_CHECK_TIMEOUT_MS = 4000;
const SESSION_TIMEOUT_MS = 6000;
const LOGIN_UI_SAFETY_MS = 3000;
const REDIRECT_GUARD_KEY = 'haibo_admin_redirect_guard';

function isLocalDev() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || window.location.protocol === 'file:';
}

export function resolveLoginPath() {
  return isLocalDev() ? '/admin/login.html' : ADMIN_LOGIN_PATH;
}

export function resolveDashboardPath() {
  return isLocalDev() ? '/admin/index.html' : ADMIN_DASHBOARD_PATH;
}

export function isLoginPage() {
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return (
    p === '/admin-login' ||
    p === '/admin/login' ||
    /\/admin\/login\.html$/i.test(p) ||
    /\/admin-login\.html$/i.test(p)
  );
}

export function isDashboardPage() {
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return p === '/admin' || /\/admin\/index\.html$/i.test(p);
}

export function showAuthLoading(message) {
  if (isLoginPage()) return;
  const el = document.getElementById('admin-auth-loading');
  if (el) {
    el.hidden = false;
    el.style.display = '';
    el.setAttribute('aria-busy', 'true');
    const msg = el.querySelector('[data-auth-loading-msg]');
    if (msg) msg.textContent = message || 'Checking session…';
  }
  document.body.classList.add('admin-auth-pending');
  document.body.classList.remove('admin-authenticated', 'admin-login-ready');
}

export function hideAuthLoading() {
  const el = document.getElementById('admin-auth-loading');
  if (el) {
    el.hidden = true;
    el.setAttribute('aria-busy', 'false');
  }
  document.body.classList.remove('admin-auth-pending');
  if (isLoginPage()) {
    document.body.classList.add('admin-login-ready');
  }
}

export function markAuthenticated() {
  document.body.classList.add('admin-authenticated');
  document.body.classList.remove('admin-auth-pending', 'admin-login-ready');
  try {
    sessionStorage.removeItem(REDIRECT_GUARD_KEY);
  } catch {
    /* ignore */
  }
}

export function showAuthBanner(message, type) {
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = message;
  el.style.color = type === 'warn' ? '#fbbf24' : '#f87171';
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

function normalizePath(path) {
  return (path || '/').replace(/\/$/, '') || '/';
}

/**
 * Prevent rapid redirect loops between /admin-login and /admin.
 */
export function safeRedirect(url) {
  const target = new URL(url, window.location.origin);
  const targetPath = normalizePath(target.pathname);
  const currentPath = normalizePath(window.location.pathname);

  if (targetPath === currentPath) {
    return false;
  }

  try {
    const raw = sessionStorage.getItem(REDIRECT_GUARD_KEY);
    const now = Date.now();
    if (raw) {
      const [ts, lastPath] = raw.split('|');
      if (now - Number(ts) < 2500 && lastPath === targetPath) {
        console.warn('[HAIBO Admin] Redirect loop prevented →', targetPath);
        return false;
      }
    }
    sessionStorage.setItem(REDIRECT_GUARD_KEY, `${now}|${targetPath}`);
  } catch {
    /* ignore */
  }

  window.location.replace(target.href);
  return true;
}

export function redirectToLogin(query) {
  const dest = resolveLoginPath() + (query ? `?${query}` : '');
  if (!isLoginPage()) safeRedirect(dest);
}

export function redirectToDashboard() {
  if (!isDashboardPage()) safeRedirect(resolveDashboardPath());
}

export async function checkIsAdminUser(user) {
  if (!user) return false;
  const db = getAdminDb();
  if (!db) {
    console.warn('[HAIBO Admin] Firestore unavailable for admin check');
    return false;
  }
  try {
    const ref = doc(db, FIRESTORE_ADMIN_COLLECTION, user.uid);
    const snap = await withTimeout(getDoc(ref), ADMIN_CHECK_TIMEOUT_MS, 'Admin verification');
    return snap.exists();
  } catch (err) {
    console.error('[HAIBO Admin] Admin check failed:', err?.code, err?.message, err);
    return false;
  }
}

/**
 * Wait until Firebase has restored persisted auth (not the first null tick).
 */
export async function waitForAuthState() {
  const auth = await ensureAuthReady();
  if (!auth) {
    return { user: null, ready: true, error: 'Auth unavailable' };
  }

  return {
    user: auth.currentUser ?? null,
    ready: true,
  };
}

export async function resolveAdminSession() {
  try {
    await ensureAuthReady();
    const state = await withTimeout(
      waitForAuthState(),
      AUTH_READY_TIMEOUT_MS,
      'Auth state'
    );
    const user = state.user ?? null;

    if (!user) {
      return { user: null, isAdmin: false, error: state.error };
    }

    const isAdmin = await checkIsAdminUser(user);
    return { user, isAdmin, error: state.error };
  } catch (err) {
    console.error('[HAIBO Admin] resolveAdminSession:', err?.message || err);
    const auth = getAdminAuth();
    return {
      user: auth?.currentUser ?? null,
      isAdmin: false,
      error: err.message,
      timedOut: String(err.message || '').includes('timed out'),
    };
  }
}

export function showUnauthorizedMessage(uid) {
  const idHint = uid ? ` Create document: admins/${uid}` : '';
  showAuthBanner(
    `This account is not authorized.${idHint} (Firestore collection "admins", document ID = your Firebase Auth UID).`,
    'error'
  );
}

export async function guardAdminDashboard(onReady) {
  if (!isFirebaseConfigured()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1><p>Edit frontend/js/firebase-config.js</p></div>';
    return;
  }

  if (isLoginPage()) {
    redirectToDashboard();
    return;
  }

  showAuthLoading('Verifying admin session…');

  const revealDashboard = (user) => {
    markAuthenticated();
    hideAuthLoading();
    if (typeof onReady === 'function') onReady(user);
  };

  const safetyTimer = setTimeout(() => {
    console.warn('[HAIBO Admin] Dashboard load safety timeout');
    const auth = getAdminAuth();
    if (auth?.currentUser) {
      revealDashboard(auth.currentUser);
    } else {
      hideAuthLoading();
      document.body.innerHTML =
        '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center;max-width:28rem;margin:0 auto">' +
        '<h2 style="color:#d98b2b">Session check timed out</h2>' +
        '<p style="margin:1rem 0;color:#aaa">Could not verify your login. Check the network and Firestore rules.</p>' +
        `<p><a href="${resolveLoginPath()}" style="color:#d98b2b">Back to login</a></p></div>`;
    }
  }, 10000);

  try {
    const session = await withTimeout(
      resolveAdminSession(),
      SESSION_TIMEOUT_MS,
      'Session check'
    );

    if (!session.user) {
      hideAuthLoading();
      if (!safeRedirect(resolveLoginPath() + (session.timedOut ? '?error=session' : ''))) {
        document.body.innerHTML =
          '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><p>Session required.</p><p><a href="' +
          resolveLoginPath() +
          '" style="color:#d98b2b">Go to login</a></p></div>';
      }
      return;
    }

    if (!session.isAdmin) {
      console.warn('[HAIBO Admin] Signed-in user is not in admins collection:', session.user.uid);
      await adminLogout();
      hideAuthLoading();
      safeRedirect(resolveLoginPath() + '?error=unauthorized');
      return;
    }

    revealDashboard(session.user);
  } catch (err) {
    console.error('[HAIBO Admin] Dashboard guard failed:', err);
    hideAuthLoading();
    const auth = getAdminAuth();
    if (auth?.currentUser) {
      const isAdmin = await checkIsAdminUser(auth.currentUser);
      if (isAdmin) {
        revealDashboard(auth.currentUser);
        return;
      }
    }
    window.location.assign(resolveLoginPath() + '?error=session');
  } finally {
    clearTimeout(safetyTimer);
  }
}

export async function guardAdminLogin(onFormReady) {
  if (!isFirebaseConfigured()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1><p>Add keys in frontend/js/firebase-config.js</p></div>';
    return;
  }

  if (isDashboardPage()) {
    await guardAdminDashboard(onFormReady);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'unauthorized') showUnauthorizedMessage(null);
  else if (params.get('error') === 'session') {
    showAuthBanner('Previous session expired. Please sign in again.', 'warn');
  }

  // Always show the login form immediately — never block on "Checking session…"
  hideAuthLoading();
  if (typeof onFormReady === 'function') onFormReady();

  try {
    const session = await withTimeout(
      resolveAdminSession(),
      SESSION_TIMEOUT_MS,
      'Session check'
    );

    if (session.user && session.isAdmin) {
      window.location.href = resolveDashboardPath();
      return;
    }

    if (session.user && !session.isAdmin) {
      console.warn('[HAIBO Admin] User signed in but not admin:', session.user.uid);
      await adminLogout();
      showUnauthorizedMessage(session.user.uid);
    }
  } catch (err) {
    console.error('[HAIBO Admin] Background session check:', err);
  }
}

export async function handleAdminLogin(email, password) {
  const cred = await withTimeout(
    adminLogin(email, password),
    SESSION_TIMEOUT_MS,
    'Sign in'
  );
  const isAdmin = await checkIsAdminUser(cred.user);
  if (!isAdmin) {
    await adminLogout();
    throw Object.assign(new Error('NOT_ADMIN'), {
      code: 'auth/not-authorized',
      friendlyMessage: `Not authorized. In Firestore create: admins/${cred.user.uid}`,
    });
  }
  try {
    sessionStorage.removeItem(REDIRECT_GUARD_KEY);
  } catch {
    /* ignore */
  }
  return cred;
}

export async function handleAdminLogout() {
  showAuthLoading('Signing out…');
  try {
    await adminLogout();
  } finally {
    hideAuthLoading();
    redirectToLogin();
  }
}

export { formatAuthError };
