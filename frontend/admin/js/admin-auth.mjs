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

const ADMIN_COLLECTION = globalThis.FIRESTORE_ADMIN_COLLECTION || 'admins';
const AUTH_WAIT_MS = 15000;
const ADMIN_DOC_TIMEOUT_MS = 12000;

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
  logAuth('admin check: reading', path);

  try {
    const ref = doc(db, ADMIN_COLLECTION, user.uid);
    const snap = await Promise.race([
      getDoc(ref),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Admin document read timed out')), ADMIN_DOC_TIMEOUT_MS)
      ),
    ]);

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

    return { ok: true, uid: user.uid, data };
  } catch (err) {
    console.error(LOG, 'admin check error', err?.code, err?.message);
    const code = err?.code || '';
    if (code === 'permission-denied' || String(err?.message || '').includes('permission')) {
      return { ok: false, reason: 'permission-denied', uid: user.uid };
    }
    return { ok: false, reason: 'check-failed', uid: user.uid, error: err };
  }
}

/** Wait for Firebase Auth persistence (authStateReady + signed-in user if any). */
export async function waitForInitialAuthState() {
  logAuth('waiting for auth state…');
  await ensureAuthReady(AUTH_WAIT_MS);
  const auth = getAdminAuth();
  if (!auth) {
    logAuth('auth instance missing');
    return null;
  }

  if (typeof auth.authStateReady === 'function') {
    try {
      await Promise.race([
        auth.authStateReady(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('authStateReady timeout')), AUTH_WAIT_MS)),
      ]);
    } catch (e) {
      logAuth('authStateReady fallback', e?.message || e);
    }
  }

  let user = auth.currentUser;
  if (!user) {
    user = await waitForSignedInUser(auth, AUTH_WAIT_MS);
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
    case 'no-db':
      return 'Firestore is not available. Check firebase-config.js and network.';
    default:
      return result?.error?.message || 'Admin verification failed.';
  }
}

export async function signInAdmin(email, password) {
  logAuth('sign-in attempt', email);
  const cred = await adminLogin(email, password);
  logAuth('login success', cred?.user?.uid, cred?.user?.email);
  return cred;
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

  if (isUnifiedAdminSpa()) {
    logAuth('SPA URL normalize →', target);
    window.history.replaceState(null, '', target);
    return false;
  }

  logAuth('redirect →', target);
  safeRedirect(target);
  return true;
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
