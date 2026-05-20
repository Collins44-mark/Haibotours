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
    const existing = getApps();
    app = existing.length ? getApp(existing[0].name) : initializeApp(FIREBASE_CONFIG);
  }
  return app;
}

export function getHaiboDb() {
  if (!isFirebaseConfigured()) return null;
  if (!db) db = getFirestore(getHaiboApp());
  return db;
}

/** Auth with local persistence — one instance per app */
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
        console.error('[HAIBO] Auth init failed:', err?.code, err?.message);
        throw err;
      }
    }
  }

  return auth;
}

function waitAuthStateReady(authInstance, timeoutMs) {
  if (!authInstance) return Promise.resolve(null);

  if (typeof authInstance.authStateReady === 'function') {
    return Promise.race([
      authInstance.authStateReady().then(() => authInstance),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('authStateReady timed out')), timeoutMs);
      }),
    ]);
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve(authInstance);
    };
    const unsub = authInstance.onAuthStateChanged(() => {
      unsub();
      done();
    });
    setTimeout(() => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
      done();
    }, timeoutMs);
  });
}

/**
 * Resolves when Auth is initialized and initial persisted state is known.
 */
export function ensureHaiboAuthReady(timeoutMs = 3000) {
  if (!isFirebaseConfigured()) return Promise.resolve(null);

  if (!authInitPromise) {
    authInitPromise = (async () => {
      try {
        const instance = getHaiboAuth();
        if (!instance) return null;
        await waitAuthStateReady(instance, timeoutMs);
        return instance;
      } catch (err) {
        console.warn('[HAIBO] Auth ready fallback:', err?.message || err);
        return getHaiboAuth();
      }
    })();
  }

  return authInitPromise;
}

window.getHaiboDb = getHaiboDb;
window.getHaiboAuth = getHaiboAuth;
window.ensureHaiboAuthReady = ensureHaiboAuthReady;
