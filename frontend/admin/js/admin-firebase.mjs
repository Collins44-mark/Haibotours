/**
 * Admin-only Firebase bootstrap (single app + auth + Firestore)
 */
import { initializeApp, getApps, getApp } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
import { getFirestore } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`;

let adminApp = null;
let adminDb = null;
let adminAuth = null;

function getAdminApp() {
  if (!isFirebaseConfigured()) return null;
  if (!adminApp) {
    adminApp = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  }
  return adminApp;
}

export function getAdminDb() {
  if (!isFirebaseConfigured()) return null;
  if (!adminDb) adminDb = getFirestore(getAdminApp());
  return adminDb;
}

export function getAdminAuth() {
  if (!isFirebaseConfigured()) return null;
  if (adminAuth) return adminAuth;

  const app = getAdminApp();
  if (!app) return null;

  try {
    adminAuth = getAuth(app);
  } catch {
    /* not ready */
  }

  if (!adminAuth) {
    try {
      adminAuth = initializeAuth(app, { persistence: browserLocalPersistence });
    } catch (err) {
      if (err?.code === 'auth/already-initialized') {
        adminAuth = getAuth(app);
      } else {
        console.error('[HAIBO Admin] Auth init:', err);
        throw err;
      }
    }
  }

  return adminAuth;
}

async function waitForAuthReady(auth, timeoutMs = 4000) {
  if (!auth) return null;
  if (typeof auth.authStateReady === 'function') {
    try {
      await Promise.race([
        auth.authStateReady(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
      ]);
    } catch (e) {
      console.warn('[HAIBO Admin] authStateReady:', e?.message || e);
    }
  }
  return auth;
}

export async function ensureAuthReady() {
  const auth = getAdminAuth();
  return waitForAuthReady(auth, 4000);
}

export function watchAdminAuth(callback) {
  const auth = getAdminAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function adminLogin(email, password) {
  await ensureAuthReady();
  const auth = getAdminAuth();
  if (!auth) throw new Error('Firebase Auth is not available');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function adminLogout() {
  const auth = getAdminAuth();
  if (!auth) return;
  return signOut(auth);
}

export function getAuthInstance() {
  return getAdminAuth();
}
