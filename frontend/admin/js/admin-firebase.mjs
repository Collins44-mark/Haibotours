import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`;
import {
  getHaiboApp,
  getHaiboDb,
  getHaiboAuth,
  ensureHaiboAuthReady,
} from '../../js/firebase-app.mjs';

export function getAdminDb() {
  return getHaiboDb();
}

export function getAdminAuth() {
  return getHaiboAuth();
}

export async function ensureAuthReady() {
  return ensureHaiboAuthReady(6000);
}

export function getAuthInstance() {
  return getHaiboAuth();
}

export function watchAdminAuth(callback) {
  const auth = getHaiboAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function adminLogin(email, password) {
  await ensureAuthReady();
  const auth = getHaiboAuth();
  if (!auth) throw new Error('Firebase Auth is not available');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function adminLogout() {
  const auth = getHaiboAuth();
  if (!auth) return;
  return signOut(auth);
}

/** Used by admin-db / admin-app (Firestore writes after auth) */
export const db = getHaiboDb();
export const auth = getHaiboAuth();

getHaiboApp();
