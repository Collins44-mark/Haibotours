import { doc, getDoc } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import {
  ensureAuthReady,
  watchAdminAuth,
  adminLogout,
  getAdminAuth,
  getAdminDb,
} from './admin-firebase.mjs';
import { formatAuthError } from './admin-errors.mjs';

const LOGIN_PATH = 'login.html';
const DASHBOARD_PATH = 'index.html';

export function isAdminRoute() {
  const path = window.location.pathname;
  return path.includes('/admin');
}

export function isLoginPage() {
  return window.location.pathname.includes('login');
}

export function showAuthLoading(message) {
  const el = document.getElementById('admin-auth-loading');
  if (!el) return;
  el.hidden = false;
  el.setAttribute('aria-busy', 'true');
  const msg = el.querySelector('[data-auth-loading-msg]');
  if (msg) msg.textContent = message || 'Checking session…';
  document.body.classList.add('admin-auth-pending');
}

export function hideAuthLoading() {
  const el = document.getElementById('admin-auth-loading');
  if (el) {
    el.hidden = true;
    el.setAttribute('aria-busy', 'false');
  }
  document.body.classList.remove('admin-auth-pending');
}

export function redirectToLogin(query) {
  const base = LOGIN_PATH + (query ? `?${query}` : '');
  if (!window.location.pathname.endsWith(LOGIN_PATH)) {
    window.location.replace(base);
  }
}

export function redirectToDashboard() {
  if (!window.location.pathname.endsWith(DASHBOARD_PATH)) {
    window.location.replace(DASHBOARD_PATH);
  }
}

/** Returns whether admins/{uid} exists (server rules use the same check for writes). */
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

/**
 * Resolves once Firebase Auth has restored persistence and fired the first state.
 */
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

/**
 * Full admin session: signed-in + admins/{uid} document.
 */
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
      'This account is not authorized for admin access. Ask the site owner to add your user ID to the admins collection in Firebase.';
    el.style.color = '#f87171';
  }
}

/**
 * Protect dashboard: redirect guests to login; sign out non-admin accounts.
 */
export async function guardAdminDashboard(onReady) {
  if (!isFirebaseConfigured()) return;

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

    hideAuthLoading();
    if (typeof onReady === 'function') onReady(user);
  } catch (err) {
    hideAuthLoading();
    console.warn('[HAIBO Admin] Session guard failed:', err);
    redirectToLogin('error=session');
  }
}

/**
 * Login page: restore session; redirect authenticated admins to dashboard.
 */
export async function guardAdminLogin(onFormReady) {
  if (!isFirebaseConfigured()) return;

  showAuthLoading('Checking session…');

  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'unauthorized') {
    showUnauthorizedMessage();
  } else if (params.get('error') === 'session') {
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

import { adminLogin } from './admin-firebase.mjs';

export async function handleAdminLogin(email, password) {
  const cred = await adminLogin(email, password);
  const isAdmin = await checkIsAdminUser(cred.user);
  if (!isAdmin) {
    await adminLogout();
    throw Object.assign(new Error('NOT_ADMIN'), {
      code: 'auth/not-authorized',
      friendlyMessage:
        'This account is not authorized. Add your Firebase Auth UID to the admins collection (see setup guide).',
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
