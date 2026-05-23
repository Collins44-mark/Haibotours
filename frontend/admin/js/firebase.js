/**
 * HAIBO Admin Firebase — app, auth, db only (+ minimal login helpers).
 */
import { getHaiboApp, getHaiboDb, getHaiboAuth } from '../../js/firebase-app.mjs';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from '../../js/firebase-cdn.mjs';

export const LOGIN_URL = '/admin/login.html';
export const DASHBOARD_URL = '/admin/dashboard.html';

export function getApp() {
  return getHaiboApp();
}

export function getAuth() {
  return getHaiboAuth();
}

export function getDb() {
  return getHaiboDb();
}

export { onAuthStateChanged };

export function log(...args) {
  console.log('[HAIBO Admin]', ...args);
}

/** True if email is in HAIBO_ADMIN_EMAIL_ALLOWLIST (firebase-config.js). */
export function isAdminEmail(email) {
  if (globalThis.HAIBO_TRUST_AUTHENTICATED_USERS === true) return true;
  const list = globalThis.HAIBO_ADMIN_EMAIL_ALLOWLIST || [];
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  return list.some((e) => String(e).trim().toLowerCase() === normalized);
}

/** Admin = signed-in user with allowlisted email (see firebase-config.js). */
export async function isAdminUser(user) {
  if (!user) return false;
  if (globalThis.HAIBO_TRUST_AUTHENTICATED_USERS === true) return true;
  return isAdminEmail(user.email);
}

export async function signInAdmin(email, password) {
  const auth = getAuth();
  if (!auth) throw new Error('Firebase Auth is not configured.');
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutAdmin() {
  const auth = getAuth();
  if (auth) await signOut(auth);
}
