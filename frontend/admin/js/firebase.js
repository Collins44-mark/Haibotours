/**
 * HAIBO Admin — Firebase app, auth, Firestore, admin check.
 */
import {
  getHaiboApp,
  getHaiboDb,
  getHaiboAuth,
  ensureHaiboAuthReady,
} from '../../js/firebase-app.mjs';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
} from '../../js/firebase-cdn.mjs';

export const LOGIN_URL = '/admin/login.html';
export const DASHBOARD_URL = '/admin/dashboard.html';

const ADMIN_COLLECTION = globalThis.FIRESTORE_ADMIN_COLLECTION || 'admins';
const LOG = '[HAIBO Admin]';

export function log(...args) {
  console.log(LOG, ...args);
}

export function getAuth() {
  return getHaiboAuth();
}

export function getDb() {
  return getHaiboDb();
}

/** admins/{uid} must have admin === true | "admin" or role === "admin" */
export function isAdminDocument(data) {
  if (!data || typeof data !== 'object') return false;
  return data.admin === true || data.admin === 'admin' || data.role === 'admin';
}

export async function checkUserIsAdmin(user, timeoutMs = 8000) {
  if (!user?.uid) return false;
  if (globalThis.HAIBO_TRUST_AUTHENTICATED_USERS === true) return true;

  const db = getDb();
  if (!db) {
    console.error(LOG, 'Firestore not available');
    return false;
  }

  const check = async () => {
    const snap = await getDoc(doc(db, ADMIN_COLLECTION, user.uid));
    if (!snap.exists()) return false;
    return isAdminDocument(snap.data());
  };

  try {
    return await Promise.race([
      check(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firestore admin check timed out')), timeoutMs);
      }),
    ]);
  } catch (err) {
    console.error(LOG, 'admin check failed', err?.code, err?.message);
    return false;
  }
}

export async function signInAdmin(email, password) {
  const auth = getAuth();
  if (!auth) throw new Error('Firebase Auth is not configured.');
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutAdmin() {
  const auth = getAuth();
  if (auth) await signOut(auth);
  log('signed out');
}

/** @deprecated Prefer ensureHaiboAuthReady from firebase-app.mjs */
export async function ensureAuthReady(timeoutMs = 5000) {
  return ensureHaiboAuthReady(timeoutMs);
}

/** Wait for Firebase Auth persistence to restore a signed-in user (ignore the first null tick). */
export function waitForSignedInUser(auth, timeoutMs = 8000) {
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (user) => {
      if (settled) return;
      settled = true;
      try {
        unsub();
      } catch {
        /* ignore */
      }
      resolve(user ?? auth.currentUser ?? null);
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) finish(user);
    });

    window.setTimeout(() => finish(auth.currentUser), timeoutMs);
  });
}

export { onAuthStateChanged, getHaiboApp };
