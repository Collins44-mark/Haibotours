/**
 * Shared admin auth gate — wait for persisted session, then verify admins/{uid}.
 */
import { ensureHaiboAuthReady } from '../../js/firebase-app.mjs';
import {
  checkUserIsAdmin,
  signOutAdmin,
  waitForSignedInUser,
  LOGIN_URL,
  log,
} from './firebase.js';

export const AUTH_GATE_TIMEOUT_MS = 10000;
const SESSION_RESTORE_MS = 8000;
const SAFETY_TIMEOUT_MS = 15000;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/** Hide loading overlay with fade (works on dashboard + SaaS pages). */
export function hideAuthLoader() {
  const el = document.getElementById('admin-auth-loading');
  if (!el) return;
  el.classList.add('is-hiding');
  el.setAttribute('aria-busy', 'false');
  window.setTimeout(() => {
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
  }, 280);
  document.body.classList.add('admin-ready');
}

export function showAuthLoaderError(message, { showRetry = true } = {}) {
  const el = document.getElementById('admin-auth-loading');
  if (!el) return;
  el.hidden = false;
  el.setAttribute('aria-hidden', 'false');
  el.classList.remove('is-hiding');
  el.setAttribute('aria-busy', 'false');
  document.body.classList.remove('admin-ready');
  el.innerHTML = `
    <div class="admin-auth-loading__inner">
      <p class="admin-auth-loading__error">${escapeHtml(message)}</p>
      <div class="admin-auth-loading__actions">
        ${showRetry ? '<button type="button" class="admin-auth-retry" data-auth-retry>Retry</button>' : ''}
        <a class="admin-auth-login-link" href="${LOGIN_URL}">Go to login</a>
      </div>
    </div>`;
  el.querySelector('[data-auth-retry]')?.addEventListener('click', () => location.reload());
}

function redirectToLogin() {
  log('redirect → login');
  window.location.replace(LOGIN_URL);
}

/**
 * @param {(user: import('firebase/auth').User) => void | Promise<void>} onAuthenticated
 */
export function runAdminAuthGate(onAuthenticated) {
  if (!globalThis.isFirebaseConfigured?.()) {
    showAuthLoaderError('Firebase is not configured. Edit frontend/js/firebase-config.js.', {
      showRetry: false,
    });
    return;
  }

  let finished = false;

  const done = () => {
    finished = true;
    window.clearTimeout(safetyTimer);
  };

  const safetyTimer = window.setTimeout(() => {
    if (finished) return;
    done();
    console.warn('[HAIBO Admin] auth safety timeout');
    showAuthLoaderError('Sign-in check timed out. Check your connection, then retry or sign in again.');
  }, SAFETY_TIMEOUT_MS);

  void (async () => {
    try {
      const auth = await ensureHaiboAuthReady(AUTH_GATE_TIMEOUT_MS);
      if (!auth) {
        done();
        showAuthLoaderError('Firebase Auth could not start. Check firebase-config.js.');
        return;
      }

      if (typeof auth.authStateReady === 'function') {
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => window.setTimeout(resolve, SESSION_RESTORE_MS)),
        ]);
      }

      const user = await waitForSignedInUser(auth, SESSION_RESTORE_MS);

      if (!user) {
        done();
        redirectToLogin();
        return;
      }

      const isAdmin = await checkUserIsAdmin(user, AUTH_GATE_TIMEOUT_MS);
      if (!isAdmin) {
        done();
        log('not an admin', user.uid);
        await signOutAdmin().catch(() => {});
        redirectToLogin();
        return;
      }

      done();
      hideAuthLoader();

      try {
        await onAuthenticated(user);
      } catch (err) {
        console.error('[HAIBO Admin] page boot failed', err);
        showAuthLoaderError(err?.message || 'Page failed to load.');
      }
    } catch (err) {
      if (finished) return;
      done();
      console.error('[HAIBO Admin] auth gate error', err);
      showAuthLoaderError(err?.message || 'Could not verify admin access.');
    }
  })();
}
