/**
 * Firebase modular SDK — single app instance for site + admin
 */
import { initializeApp, getApps, getApp } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`;
import { getFirestore } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import { getAuth } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`;

let app = null;
let db = null;
let auth = null;

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

export function getHaiboAuth() {
  if (!isFirebaseConfigured()) return null;
  if (!auth) auth = getAuth(getHaiboApp());
  return auth;
}

window.getHaiboDb = getHaiboDb;
window.getHaiboAuth = getHaiboAuth;
