/**
 * Firebase modular SDK — single app instance for site + admin
 */
import { initializeApp, getApps, getApp } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
import { getFirestore } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
} from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`;

let app = null;
let db = null;
let auth = null;
let authInitPromise = null;

export function getHaiboApp() {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  }
  return app;
}

export function getHaiboDb() {
  if (!isFirebaseConfigured()) return null;
  if (!db) db = getFirestore(getHaiboApp());
  return db;
}

/** Auth with local persistence — safe for admin session restore */
export function getHaiboAuth() {
  if (!isFirebaseConfigured()) return null;
  if (auth) return auth;

  const haiboApp = getHaiboApp();
  if (!haiboApp) return null;

  try {
    auth = getAuth(haiboApp);
  } catch {
    /* not initialized yet */
  }

  if (!auth) {
    try {
      auth = initializeAuth(haiboApp, {
        persistence: browserLocalPersistence,
      });
    } catch (err) {
      if (err?.code === 'auth/already-initialized') {
        auth = getAuth(haiboApp);
      } else {
        console.warn('[HAIBO] Auth init:', err);
        throw err;
      }
    }
  }

  return auth;
}

/**
 * Resolves when Auth is ready (never blocks indefinitely).
 */
export function ensureHaiboAuthReady(timeoutMs = 6000) {
  if (!isFirebaseConfigured()) return Promise.resolve(null);

  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      let done = false;
      const finish = (instance) => {
        if (done) return;
        done = true;
        resolve(instance);
      };

      const timer = setTimeout(() => {
        console.warn('[HAIBO] Auth init timeout — continuing with best-effort auth');
        finish(getHaiboAuth());
      }, timeoutMs);

      try {
        const instance = getHaiboAuth();
        clearTimeout(timer);
        finish(instance);
      } catch (err) {
        clearTimeout(timer);
        console.warn('[HAIBO] Auth init error:', err);
        finish(null);
      }
    });
  }

  return authInitPromise;
}

window.getHaiboDb = getHaiboDb;
window.getHaiboAuth = getHaiboAuth;
window.ensureHaiboAuthReady = ensureHaiboAuthReady;
