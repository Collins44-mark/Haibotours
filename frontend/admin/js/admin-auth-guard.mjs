import { doc, getDoc } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import {
  ensureAuthReady,
  adminLogout,
  getAdminAuth,
  getAdminDb,
  adminLogin,
  waitForSignedInUser,
} from './admin-firebase.mjs';
import { formatAuthError } from './admin-errors.mjs';

/** Canonical routes (Vercel rewrites) */
export const ADMIN_LOGIN_PATH = '/admin-login';
export const ADMIN_DASHBOARD_PATH = '/admin';

const AUTH_READY_TIMEOUT_MS = 8000;
const ADMIN_CHECK_TIMEOUT_MS = 8000;
const SESSION_TIMEOUT_MS = 12000;
const REDIRECT_GUARD_KEY = 'haibo_admin_redirect_guard';
const JUST_LOGGED_IN_KEY = 'haibo_admin_just_logged_in';

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
  if (!user) return { ok: false, reason: 'no-user' };
  const db = getAdminDb();
  if (!db) {
    console.warn('[HAIBO Admin] Firestore unavailable for admin check');
    return { ok: false, reason: 'no-db' };
  }
  try {
    const ref = doc(db, FIRESTORE_ADMIN_COLLECTION, user.uid);
    const snap = await withTimeout(getDoc(ref), ADMIN_CHECK_TIMEOUT_MS, 'Admin verification');
    if (snap.exists()) return { ok: true };
    return { ok: false, reason: 'not-in-admins', uid: user.uid };
  } catch (err) {
    console.error('[HAIBO Admin] Admin check failed:', err?.code, err?.message, err);
    const code = err?.code || '';
    if (code === 'permission-denied' || String(err?.message || '').includes('permission')) {
      return { ok: false, reason: 'permission-denied', uid: user.uid };
    }
    return { ok: false, reason: 'check-failed', uid: user.uid };
  }
}

/**
 * Wait until Firebase has restored persisted auth (not the first null tick).
 */
export async function waitForAuthState(timeoutMs = AUTH_READY_TIMEOUT_MS) {
  const auth = await ensureAuthReady(timeoutMs);
  if (!auth) {
    return { user: null, ready: true, error: 'Auth unavailable' };
  }

  const user = await withTimeout(
    waitForSignedInUser(auth, timeoutMs),
    timeoutMs,
    'Auth state'
  );
  return { user: user ?? auth.currentUser ?? null, ready: true };
}

function justLoggedInRecently() {
  try {
    const raw = sessionStorage.getItem(JUST_LOGGED_IN_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < 30000;
  } catch {
    return false;
  }
}

export function markJustLoggedIn() {
  try {
    sessionStorage.setItem(JUST_LOGGED_IN_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export async function resolveAdminSession() {
  const retries = justLoggedInRecently() ? 6 : 2;
  const retryDelayMs = 450;
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await ensureAuthReady(AUTH_READY_TIMEOUT_MS);
      const state = await waitForAuthState(AUTH_READY_TIMEOUT_MS);
      const user = state.user ?? null;

      if (!user) {
        lastError = state.error || 'No signed-in user';
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, retryDelayMs));
          continue;
        }
        return { user: null, isAdmin: false, error: lastError };
      }

      const adminResult = await checkIsAdminUser(user);
      if (adminResult.ok) {
        try {
          sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
        } catch {
          /* ignore */
        }
        return { user, isAdmin: true };
      }

      return {
        user,
        isAdmin: false,
        adminReason: adminResult.reason,
        uid: adminResult.uid || user.uid,
      };
    } catch (err) {
      lastError = err.message;
      console.error('[HAIBO Admin] resolveAdminSession attempt', attempt + 1, err);
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
    }
  }

  const auth = getAdminAuth();
  return {
    user: auth?.currentUser ?? null,
    isAdmin: false,
    error: lastError,
    timedOut: String(lastError || '').includes('timed out'),
  };
}

export function showUnauthorizedMessage(uid, reason) {
  if (reason === 'permission-denied') {
    showAuthBanner(
      'Firestore blocked the admin check. Deploy firebase/firestore.rules and ensure you are signed in.',
      'error'
    );
    return;
  }
  const idHint = uid ? ` In Firebase Console → Firestore, create collection "admins" with document ID: ${uid}` : '';
  showAuthBanner(`This account is not authorized.${idHint}`, 'error');
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

  const safetyTimer = setTimeout(async () => {
    console.warn('[HAIBO Admin] Dashboard load safety timeout');
    const auth = getAdminAuth();
    const user = auth?.currentUser;
    if (user) {
      const adminResult = await checkIsAdminUser(user);
      if (adminResult.ok) {
        revealDashboard(user);
        return;
      }
    }
    hideAuthLoading();
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center;max-width:28rem;margin:0 auto">' +
      '<h2 style="color:#d98b2b">Session check timed out</h2>' +
      '<p style="margin:1rem 0;color:#aaa">Could not verify your login. Check the network, Firestore rules, and your admins document.</p>' +
      `<p><a href="${resolveLoginPath()}" style="color:#d98b2b">Back to login</a></p></div>`;
  }, 15000);

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
      console.warn(
        '[HAIBO Admin] Not authorized:',
        session.user.uid,
        session.adminReason || session.error
      );
      try {
        sessionStorage.setItem('haibo_admin_last_uid', session.user.uid);
      } catch {
        /* ignore */
      }
      await adminLogout();
      hideAuthLoading();
      const q =
        session.adminReason === 'permission-denied' ? '?error=firestore' : '?error=unauthorized';
      safeRedirect(resolveLoginPath() + q);
      return;
    }

    revealDashboard(session.user);
  } catch (err) {
    console.error('[HAIBO Admin] Dashboard guard failed:', err);
    hideAuthLoading();
    const auth = getAdminAuth();
    if (auth?.currentUser) {
      const adminResult = await checkIsAdminUser(auth.currentUser);
      if (adminResult.ok) {
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
  let hintUid = null;
  try {
    hintUid = sessionStorage.getItem('haibo_admin_last_uid');
  } catch {
    /* ignore */
  }
  if (params.get('error') === 'unauthorized') showUnauthorizedMessage(hintUid, 'not-in-admins');
  else if (params.get('error') === 'firestore') {
    showUnauthorizedMessage(hintUid, 'permission-denied');
  } else if (params.get('error') === 'session') {
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
      showUnauthorizedMessage(session.uid || session.user.uid, session.adminReason);
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
  const adminResult = await checkIsAdminUser(cred.user);
  if (!adminResult.ok) {
    await adminLogout();
    const msg =
      adminResult.reason === 'permission-denied'
        ? 'Firestore blocked admin verification. Deploy firestore.rules from this project.'
        : `Not authorized. In Firestore create document: admins/${cred.user.uid} (empty doc is OK).`;
    throw Object.assign(new Error('NOT_ADMIN'), {
      code: 'auth/not-authorized',
      friendlyMessage: msg,
    });
  }
  markJustLoggedIn();
  try {
    sessionStorage.removeItem(REDIRECT_GUARD_KEY);
    sessionStorage.setItem('haibo_admin_last_uid', cred.user.uid);
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
