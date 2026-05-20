import { doc, getDoc } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import {
  ensureAuthReady,
  watchAdminAuth,
  adminLogout,
  getAdminAuth,
  getAdminDb,
} from './admin-firebase.mjs';
import { adminLogin } from './admin-firebase.mjs';
import { formatAuthError } from './admin-errors.mjs';

/** Canonical routes (Vercel rewrites) */
export const ADMIN_LOGIN_PATH = '/admin-login';
export const ADMIN_DASHBOARD_PATH = '/admin';

const AUTH_STATE_TIMEOUT_MS = 4000;
const ADMIN_CHECK_TIMEOUT_MS = 5000;
const SESSION_TIMEOUT_MS = 8000;

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
  const el = document.getElementById('admin-auth-loading');
  if (el) {
    el.hidden = false;
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

export function redirectToLogin(query) {
  const dest = resolveLoginPath() + (query ? `?${query}` : '');
  if (!isLoginPage()) window.location.replace(dest);
}

export function redirectToDashboard() {
  if (!isDashboardPage()) window.location.replace(resolveDashboardPath());
}

export async function checkIsAdminUser(user) {
  if (!user) return false;
  const db = getAdminDb();
  if (!db) return false;
  try {
    const ref = doc(db, FIRESTORE_ADMIN_COLLECTION, user.uid);
    const snap = await withTimeout(getDoc(ref), ADMIN_CHECK_TIMEOUT_MS, 'Admin verification');
    return snap.exists();
  } catch (err) {
    console.warn('[HAIBO Admin] Admin check failed:', err?.code || err?.message);
    return false;
  }
}

/**
 * First auth state from Firebase (with timeout — never hangs forever).
 */
export async function waitForAuthState() {
  await ensureAuthReady();

  const auth = getAdminAuth();
  if (!auth) {
    return { user: null, ready: true, error: 'Auth unavailable' };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    let unsub = () => {};
    try {
      unsub = watchAdminAuth((user) => {
        unsub();
        finish({ user: user ?? null, ready: true });
      });
    } catch (err) {
      finish({ user: null, ready: true, error: err.message });
      return;
    }

    setTimeout(() => {
      unsub();
      finish({
        user: auth.currentUser ?? null,
        ready: true,
        timedOut: true,
      });
    }, AUTH_STATE_TIMEOUT_MS);
  });
}

export async function resolveAdminSession() {
  try {
    await ensureAuthReady();
    const state = await waitForAuthState();
    const user = state.user ?? null;

    if (!user) {
      return { user: null, isAdmin: false, timedOut: state.timedOut, error: state.error };
    }

    const isAdmin = await checkIsAdminUser(user);
    return { user, isAdmin, timedOut: state.timedOut, error: state.error };
  } catch (err) {
    console.warn('[HAIBO Admin] resolveAdminSession:', err);
    return { user: null, isAdmin: false, error: err.message };
  }
}

export function showUnauthorizedMessage() {
  showAuthBanner(
    'This account is not authorized. Add your Firebase Auth UID to the admins collection in Firestore.',
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

  try {
    const session = await withTimeout(
      resolveAdminSession(),
      SESSION_TIMEOUT_MS,
      'Session check'
    );

    if (!session.user) {
      hideAuthLoading();
      redirectToLogin(session.timedOut ? 'error=session' : undefined);
      return;
    }

    if (!session.isAdmin) {
      await adminLogout();
      hideAuthLoading();
      redirectToLogin('error=unauthorized');
      return;
    }

    markAuthenticated();
    hideAuthLoading();
    if (typeof onReady === 'function') onReady(session.user);
  } catch (err) {
    hideAuthLoading();
    console.warn('[HAIBO Admin] Session guard failed:', err);
    redirectToLogin('error=session');
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
  if (params.get('error') === 'unauthorized') showUnauthorizedMessage();
  else if (params.get('error') === 'session') {
    showAuthBanner('Previous session expired. Please sign in again.', 'warn');
  }

  showAuthLoading('Checking session…');

  const revealLogin = () => {
    hideAuthLoading();
    if (typeof onFormReady === 'function') onFormReady();
  };

  try {
    const session = await withTimeout(
      resolveAdminSession(),
      SESSION_TIMEOUT_MS,
      'Session check'
    );

    if (session.user && session.isAdmin) {
      redirectToDashboard();
      return;
    }

    if (session.user && !session.isAdmin) {
      await adminLogout();
      showUnauthorizedMessage();
    } else if (session.timedOut || session.error) {
      showAuthBanner(
        'Could not verify an existing session. Sign in below to continue.',
        'warn'
      );
    }
  } catch (err) {
    console.warn('[HAIBO Admin] Login guard:', err);
    showAuthBanner(
      formatAuthError(err) || 'Authentication check failed. You can still sign in below.',
      'warn'
    );
  } finally {
    revealLogin();
  }
}

export async function handleAdminLogin(email, password) {
  const cred = await adminLogin(email, password);
  const isAdmin = await checkIsAdminUser(cred.user);
  if (!isAdmin) {
    await adminLogout();
    throw Object.assign(new Error('NOT_ADMIN'), {
      code: 'auth/not-authorized',
      friendlyMessage:
        'This account is not authorized. Add your Firebase Auth UID to the admins collection.',
    });
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
