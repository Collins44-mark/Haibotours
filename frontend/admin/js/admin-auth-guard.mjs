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
  const p = window.location.pathname;
  return p.includes('admin-login') || /\/admin\/login\.html$/i.test(p);
}

export function isDashboardPage() {
  const p = window.location.pathname.replace(/\/$/, '');
  return p === '/admin' || /\/admin\/index\.html$/i.test(p);
}

export function showAuthLoading(message) {
  const el = document.getElementById('admin-auth-loading');
  if (!el) return;
  el.hidden = false;
  el.setAttribute('aria-busy', 'true');
  const msg = el.querySelector('[data-auth-loading-msg]');
  if (msg) msg.textContent = message || 'Checking session…';
  document.body.classList.add('admin-auth-pending');
  document.body.classList.remove('admin-authenticated');
}

export function hideAuthLoading() {
  const el = document.getElementById('admin-auth-loading');
  if (el) {
    el.hidden = true;
    el.setAttribute('aria-busy', 'false');
  }
  document.body.classList.remove('admin-auth-pending');
}

export function markAuthenticated() {
  document.body.classList.add('admin-authenticated');
  document.body.classList.remove('admin-auth-pending');
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
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (err) {
    console.warn('[HAIBO Admin] Admin check failed:', err?.code);
    return false;
  }
}

export function waitForAuthState() {
  const auth = getAdminAuth();
  if (!auth) return Promise.resolve({ user: null, ready: true });

  return new Promise((resolve) => {
    let settled = false;
    const unsub = watchAdminAuth((user) => {
      if (settled) return;
      settled = true;
      unsub();
      resolve({ user, ready: true });
    });
    setTimeout(() => {
      if (!settled) {
        settled = true;
        unsub();
        resolve({ user: auth.currentUser, ready: true });
      }
    }, 8000);
  });
}

export async function resolveAdminSession() {
  await ensureAuthReady();
  const { user } = await waitForAuthState();
  if (!user) return { user: null, isAdmin: false };
  const isAdmin = await checkIsAdminUser(user);
  return { user, isAdmin };
}

export function showUnauthorizedMessage() {
  const el = document.getElementById('login-error');
  if (el) {
    el.textContent =
      'This account is not authorized. Add your Firebase Auth UID to the admins collection in Firestore.';
    el.style.color = '#f87171';
  }
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
    const { user, isAdmin } = await resolveAdminSession();

    if (!user) {
      hideAuthLoading();
      redirectToLogin();
      return;
    }

    if (!isAdmin) {
      await adminLogout();
      hideAuthLoading();
      redirectToLogin('error=unauthorized');
      return;
    }

    markAuthenticated();
    hideAuthLoading();
    if (typeof onReady === 'function') onReady(user);
  } catch (err) {
    hideAuthLoading();
    console.warn('[HAIBO Admin] Session guard failed:', err);
    redirectToLogin('error=session');
  }
}

export async function guardAdminLogin(onFormReady) {
  if (!isFirebaseConfigured()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1></div>';
    return;
  }

  if (isDashboardPage()) {
    guardAdminDashboard(onFormReady);
    return;
  }

  showAuthLoading('Checking session…');

  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'unauthorized') showUnauthorizedMessage();
  else if (params.get('error') === 'session') {
    const el = document.getElementById('login-error');
    if (el) {
      el.textContent = 'Session could not be verified. Please sign in again.';
      el.style.color = '#f87171';
    }
  }

  try {
    const { user, isAdmin } = await resolveAdminSession();

    if (user && isAdmin) {
      redirectToDashboard();
      return;
    }

    if (user && !isAdmin) {
      await adminLogout();
      showUnauthorizedMessage();
    }

    hideAuthLoading();
    if (typeof onFormReady === 'function') onFormReady();
  } catch (err) {
    hideAuthLoading();
    if (typeof onFormReady === 'function') onFormReady();
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
