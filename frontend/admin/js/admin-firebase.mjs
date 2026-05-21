/**
 * Admin Firebase — same app/auth/db as the public site (one Auth instance).
 */
import {
  getHaiboApp,
  getHaiboDb,
  getHaiboAuth,
  ensureHaiboAuthReady,
} from '../../js/firebase-app.mjs';
import { FIREBASE_SDK_VERSION } from '../../js/firebase-sdk-version.mjs';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`;

export { onAuthStateChanged };

export function getAdminApp() {
  return getHaiboApp();
}

export function getAdminDb() {
  return getHaiboDb();
}

export function getAdminAuth() {
  return getHaiboAuth();
}

export async function ensureAuthReady(timeoutMs = 8000) {
  return ensureHaiboAuthReady(timeoutMs);
}

export async function adminLogin(email, password) {
  await ensureAuthReady();
  const auth = getAdminAuth();
  if (!auth) throw new Error('Firebase Auth is not available');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureAuthReady();
  if (!auth.currentUser) {
    await waitForSignedInUser(auth, 5000);
  }
  return cred;
}

export async function adminLogout() {
  const auth = getAdminAuth();
  if (!auth) return;
  return signOut(auth);
}

export function getAuthInstance() {
  return getAdminAuth();
}

/** Resolve when Firebase reports a signed-in user (persistence restore). */
export function waitForSignedInUser(auth, timeoutMs = 8000) {
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    let done = false;
    const finish = (user) => {
      if (done) return;
      done = true;
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
    setTimeout(() => finish(auth.currentUser), timeoutMs);
  });
}

export function watchAdminAuth(callback) {
  const auth = getAdminAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
