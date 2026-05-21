/**
 * HAIBO Admin — auth session, Firestore admin verify, redirects (with debug logs).
 */
import { FIREBASE_SDK_VERSION } from '../../js/firebase-sdk-version.mjs';
import { doc, getDoc } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import {
  ensureAuthReady,
  adminLogin,
  adminLogout,
  getAdminAuth,
  getAdminDb,
  onAuthStateChanged,
  waitForSignedInUser,
} from './admin-firebase.mjs';
import {
  resolveLoginPath,
  resolveDashboardPath,
  isLoginPage,
  isDashboardPage,
  formatAuthError,
  safeRedirect,
} from './admin-auth-guard.mjs';

import {
  withTimeout,
  LOGIN_REQUEST_TIMEOUT_MS,
  ADMIN_VERIFY_TIMEOUT_MS,
  AUTH_BOOT_TIMEOUT_MS,
} from './admin-auth-timeouts.mjs';

const ADMIN_COLLECTION = globalThis.FIRESTORE_ADMIN_COLLECTION || 'admins';
const AUTH_WAIT_MS = AUTH_BOOT_TIMEOUT_MS;

const LOG = '[HAIBO Admin Auth]';

export function logAuth(...args) {
  console.log(LOG, ...args);
}

function isAdminDocumentValid(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.admin === 'admin' || data.admin === true) return true;
  if (data.role === 'admin') return true;
  return false;
}

/**
 * Read admins/{uid} and require admin field (or role: admin).
 */
export async function verifyAdminAccess(user) {
  if (!user?.uid) {
    logAuth('admin check: no user');
    return { ok: false, reason: 'no-user' };
  }

  if (globalThis.HAIBO_TRUST_AUTHENTICATED_USERS === true) {
    logAuth('admin check: trusted-auth bypass');
    return { ok: true, reason: 'trusted-auth', uid: user.uid };
  }

  const db = getAdminDb();
  if (!db) {
    logAuth('admin check: Firestore unavailable');
    return { ok: false, reason: 'no-db' };
  }

  const path = `${ADMIN_COLLECTION}/${user.uid}`;
  logAuth('Firestore admin check started', path);

  try {
    const ref = doc(db, ADMIN_COLLECTION, user.uid);
    const snap = await withTimeout(getDoc(ref), ADMIN_VERIFY_TIMEOUT_MS, 'Firestore admin check');

    const exists = snap.exists();
    const data = exists ? snap.data() : null;
    logAuth('admin check result', { exists, data, uid: user.uid });

    if (!exists) {
      return { ok: false, reason: 'not-in-admins', uid: user.uid };
    }

    if (!isAdminDocumentValid(data)) {
      return {
        ok: false,
        reason: 'missing-admin-field',
        uid: user.uid,
        detail: 'Document must include field admin: "admin" (or role: "admin").',
      };
    }

    logAuth('admin verified', user.uid);
    return { ok: true, uid: user.uid, data };
  } catch (err) {
    console.error(LOG, 'Firestore admin check error', err?.code, err?.message, err);
    const code = err?.code || '';
    const msg = String(err?.message || '');
    if (msg.includes('timed out')) {
      return { ok: false, reason: 'check-timeout', uid: user.uid, error: err };
    }
    if (code === 'permission-denied' || msg.includes('permission')) {
      return { ok: false, reason: 'permission-denied', uid: user.uid };
    }
    if (code === 'unavailable' || msg.includes('network')) {
      return { ok: false, reason: 'network-error', uid: user.uid, error: err };
    }
    return { ok: false, reason: 'check-failed', uid: user.uid, error: err };
  }
}

/** Wait for Firebase Auth persistence (authStateReady + signed-in user if any). */
export async function waitForInitialAuthState() {
  logAuth('waiting for auth state…');
  try {
    await withTimeout(ensureAuthReady(AUTH_WAIT_MS), AUTH_WAIT_MS, 'Auth ready');
  } catch (e) {
    logAuth('auth ready timeout/fallback', e?.message || e);
  }

  const auth = getAdminAuth();
  if (!auth) {
    logAuth('auth instance missing');
    return null;
  }

  if (typeof auth.authStateReady === 'function') {
    try {
      await withTimeout(auth.authStateReady(), AUTH_WAIT_MS, 'authStateReady');
    } catch (e) {
      logAuth('authStateReady fallback', e?.message || e);
    }
  }

  let user = auth.currentUser;
  if (!user) {
    try {
      user = await withTimeout(waitForSignedInUser(auth, AUTH_WAIT_MS), AUTH_WAIT_MS, 'Wait for user');
    } catch {
      user = auth.currentUser ?? null;
    }
  }

  logAuth('auth state detected', user ? { uid: user.uid, email: user.email } : 'signed-out');
  return user ?? null;
}

export function messageForAdminFailure(result) {
  const uid = result?.uid || '';
  switch (result?.reason) {
    case 'permission-denied':
      return `Firestore blocked reading admins/${uid}. Publish firebase/firestore.rules in Console.`;
    case 'missing-admin-field':
      return `Not an admin: admins/${uid} must include field admin: "admin". ${result.detail || ''}`;
    case 'not-in-admins':
      return `Not an admin: no admins/${uid} document. Create it in Firestore (UID from Authentication).`;
    case 'check-timeout':
      return 'Network timeout verifying admin access. Check connection and try again.';
    case 'network-error':
      return 'Network error while verifying admin access. Try again.';
    case 'no-db':
      return 'Firestore is not available. Check firebase-config.js and network.';
    default:
      return result?.error?.message || 'Admin verification failed.';
  }
}

export async function signInAdmin(email, password) {
  logAuth('sign-in attempt', email);
  try {
    const cred = await adminLogin(email, password);
    logAuth('login success', cred?.user?.uid, cred?.user?.email);
    logAuth('current user UID', cred?.user?.uid);
    return cred;
  } catch (err) {
    console.error(LOG, 'login error', err?.code, err?.message, err);
    throw err;
  }
}

export async function signOutAdminUser() {
  logAuth('sign-out');
  await adminLogout();
}

function isUnifiedAdminSpa() {
  return Boolean(document.getElementById('admin-login-gate') && document.getElementById('admin-app-root'));
}

/**
 * Canonical URL: signed-in admins on /admin, signed-out on /admin-login (prod).
 * Same index.html on Vercel — use replaceState to avoid reload loops.
 */
/** Production dashboard paths (Vercel rewrites → admin/index.html) */
export const ADMIN_DASHBOARD_URL = '/admin';

export function redirectIfNeeded(wantDashboard) {
  const loginPath = resolveLoginPath();
  const dashPath = resolveDashboardPath();
  const target = wantDashboard ? dashPath : loginPath;
  const current = window.location.pathname.replace(/\/$/, '') || '/';
  const normalizedTarget = target.replace(/\/$/, '') || '/';

  if (current === normalizedTarget) {
    logAuth('redirect skipped (already on)', current);
    return false;
  }

  logAuth('redirect started →', target);

  if (isUnifiedAdminSpa()) {
    window.history.replaceState(null, '', target);
    logAuth('redirect completed (SPA)', target);
    return false;
  }

  safeRedirect(target);
  logAuth('redirect completed', target);
  return true;
}

/** After login: normalize URL to /admin (or local index) without blocking UI */
export function completeLoginRedirect() {
  const dashPath = resolveDashboardPath();
  logAuth('redirect started', dashPath);
  const current = window.location.pathname.replace(/\/$/, '') || '/';
  const normalized = dashPath.replace(/\/$/, '') || '/';
  if (current !== normalized) {
    window.history.replaceState(null, '', dashPath);
  }
  logAuth('redirect completed', window.location.pathname);
}

export function attachAuthListener({ onSignedIn, onSignedOut }) {
  const auth = getAdminAuth();
  if (!auth) return () => {};

  let first = true;
  return onAuthStateChanged(auth, (user) => {
    if (first) {
      first = false;
      logAuth('auth listener (initial, ignored)', user?.uid || 'null');
      return;
    }
    logAuth('auth listener', user?.uid || 'signed-out');
    if (user) {
      onSignedIn?.(user);
    } else {
      onSignedOut?.();
    }
  });
}

export {
  resolveLoginPath,
  resolveDashboardPath,
  isLoginPage,
  isDashboardPage,
  formatAuthError,
};
