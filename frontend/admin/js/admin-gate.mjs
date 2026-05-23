/**
 * Simple admin page guard — Firebase onAuthStateChanged only.
 */
import { getAuth, LOGIN_URL, onAuthStateChanged } from './firebase.js';

const SAFETY_MS = 12000;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function hideLoader() {
  const el = document.getElementById('admin-auth-loading');
  if (el) {
    el.hidden = true;
    el.classList.add('is-hiding');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('aria-busy', 'false');
  }
  document.body.classList.remove('auth-loading');
  document.body.classList.add('admin-ready');
}

export function showAuthLoaderError(message) {
  const el = document.getElementById('admin-auth-loading');
  if (!el) return;
  el.hidden = false;
  el.classList.remove('is-hiding');
  el.setAttribute('aria-busy', 'false');
  el.innerHTML = `
    <div class="admin-auth-loading__inner">
      <p class="admin-auth-loading__error">${escapeHtml(message)}</p>
      <p style="margin-top:1rem"><a href="${LOGIN_URL}" style="color:#d98b2b">Go to login</a></p>
    </div>`;
  document.body.classList.remove('auth-loading');
}

function revealShell() {
  hideLoader();
  const root = document.getElementById('app') || document.getElementById('admin-app-root');
  if (root) root.hidden = false;
}

/**
 * Protect an admin page: redirect if signed out, then run initPage(user).
 * @param {(user: import('firebase/auth').User) => void | Promise<void>} initPage
 */
export function protectAdminPage(initPage) {
  if (!globalThis.isFirebaseConfigured?.()) {
    showAuthLoaderError('Firebase is not configured. Edit frontend/js/firebase-config.js.');
    return;
  }

  const auth = getAuth();
  if (!auth) {
    showAuthLoaderError('Firebase Auth could not start.');
    return;
  }

  document.body.classList.add('auth-loading');
  let started = false;

  const start = (user) => {
    if (started) return;
    if (!user) {
      window.location.replace(LOGIN_URL);
      return;
    }
    started = true;
    clearTimeout(safetyTimer);
    revealShell();
    Promise.resolve(initPage(user)).catch((err) => {
      console.error('[HAIBO Admin] page init failed', err);
      showAuthLoaderError(err?.message || 'Page failed to load.');
    });
  };

  const safetyTimer = window.setTimeout(() => {
    if (started) return;
    if (auth.currentUser) {
      start(auth.currentUser);
      return;
    }
    showAuthLoaderError('Session check timed out.');
    window.setTimeout(() => window.location.replace(LOGIN_URL), 1200);
  }, SAFETY_MS);

  onAuthStateChanged(auth, (user) => {
    if (user) start(user);
  });

  if (auth.currentUser) start(auth.currentUser);
}

/** @deprecated Use protectAdminPage */
export const runAdminAuthGate = protectAdminPage;

export const hideAuthLoader = hideLoader;
