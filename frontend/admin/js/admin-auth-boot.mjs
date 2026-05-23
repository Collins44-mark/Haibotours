/**
 * Shared admin auth gate — one listener, 5s timeout, no infinite loader.
 */
import {
  getAuth,
  ensureAuthReady,
  checkUserIsAdmin,
  signOutAdmin,
  LOGIN_URL,
  onAuthStateChanged,
  log,
} from './firebase.js';

export const AUTH_GATE_TIMEOUT_MS = 5000;

let gateActive = false;

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
  if (gateActive) return;
  gateActive = true;

  if (!globalThis.isFirebaseConfigured?.()) {
    showAuthLoaderError('Firebase is not configured. Edit frontend/js/firebase-config.js.', {
      showRetry: false,
    });
    return;
  }

  let settled = false;
  let unsubscribe = () => {};

  const gateTimer = window.setTimeout(() => {
    if (settled) return;
    settled = true;
    try {
      unsubscribe();
    } catch {
      /* ignore */
    }
    log('auth gate timed out');
    showAuthLoaderError('Sign-in check timed out. Check your connection, then retry or sign in again.');
  }, AUTH_GATE_TIMEOUT_MS);

  const settle = () => {
    settled = true;
    window.clearTimeout(gateTimer);
    try {
      unsubscribe();
    } catch {
      /* ignore */
    }
  };

  const handleUser = async (user) => {
    if (settled) return;

    if (!user) {
      settle();
      redirectToLogin();
      return;
    }

    try {
      const isAdmin = await Promise.race([
        checkUserIsAdmin(user),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('Admin verification timed out')), AUTH_GATE_TIMEOUT_MS);
        }),
      ]);

      if (settled) return;

      if (!isAdmin) {
        settle();
        log('not an admin', user.uid);
        await signOutAdmin().catch(() => {});
        redirectToLogin();
        return;
      }

      settle();
      hideAuthLoader();
      await onAuthenticated(user);
    } catch (err) {
      if (settled) return;
      settle();
      console.error('[HAIBO Admin] auth gate error', err);
      showAuthLoaderError(err?.message || 'Could not verify admin access.');
    }
  };

  void (async () => {
    try {
      const auth = await ensureAuthReady(AUTH_GATE_TIMEOUT_MS);
      if (!auth) {
        settled = true;
        window.clearTimeout(gateTimer);
        showAuthLoaderError('Firebase Auth could not start. Check firebase-config.js.');
        return;
      }

      if (typeof auth.authStateReady === 'function') {
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => window.setTimeout(resolve, AUTH_GATE_TIMEOUT_MS)),
        ]);
      }

      const existing = auth.currentUser;
      if (existing) {
        await handleUser(existing);
        if (settled) return;
      }

      unsubscribe = onAuthStateChanged(auth, (user) => {
        log('auth state', user?.uid || 'signed-out');
        void handleUser(user);
      });
    } catch (err) {
      if (settled) return;
      settled = true;
      window.clearTimeout(gateTimer);
      console.error('[HAIBO Admin] auth init failed', err);
      showAuthLoaderError(err?.message || 'Firebase failed to load.');
    }
  })();
}
