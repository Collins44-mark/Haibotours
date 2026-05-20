import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`;
import { getHaiboApp, getHaiboDb, getHaiboAuth } from '../../js/firebase-app.mjs';

export function getAdminDb() {
  return getHaiboDb();
}

export function getAdminAuth() {
  return getHaiboAuth();
}

/** Survives browser restarts; session restored before dashboard loads */
let persistenceReady = Promise.resolve();

if (isFirebaseConfigured()) {
  const auth = getHaiboAuth();
  persistenceReady = setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Auth persistence:', err);
  });
  getHaiboApp();
}

export const db = getHaiboDb();
export const auth = getHaiboAuth();

export async function ensureAuthReady() {
  await persistenceReady;
}

export function watchAdminAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function adminLogin(email, password) {
  if (!auth) throw new Error('Firebase is not configured');
  await ensureAuthReady();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function adminLogout() {
  if (!auth) return;
  return signOut(auth);
}
