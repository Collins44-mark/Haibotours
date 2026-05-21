/**
 * Admin UI shell — login overlay + dashboard on one document (/admin).
 */
import {
  getRestoredSessionUser,
  verifyAdminAccess,
  signInAdmin,
  signOutAdminUser,
  redirectIfNeeded,
  completeLoginRedirect,
  attachAuthListener,
  messageForAdminFailure,
  formatAuthError,
  logAuth,
  isLoginPage,
  isDashboardPage,
} from './admin-auth.mjs';
import { getAdminAuth, getAdminDb } from './admin-firebase.mjs';

const AUTH_BOOT_TIMEOUT_MS = 10000;
let authListenerCooldownUntil = 0;

let cmsStarted = false;
let sessionLocked = false;
let bootDone = false;
let loginInProgress = false;
let authListenerUnsub = null;

function el(id) {
  return document.getElementById(id);
}

function isDashboardVisible() {
  return sessionLocked || document.body.classList.contains('admin-authenticated');
}

function hideLoading() {
  const loading = el('admin-auth-loading');
  if (loading) {
    loading.hidden = true;
    loading.setAttribute('aria-busy', 'false');
  }
  document.body.classList.remove('admin-auth-pending');
}

function showLoadingOverlay(message) {
  const loading = el('admin-auth-loading');
  if (loading) {
    loading.hidden = false;
    loading.setAttribute('aria-busy', 'true');
    const msg = loading.querySelector('[data-auth-loading-msg]');
    if (msg) msg.textContent = message || 'Signing in…';
  }
  document.body.classList.add('admin-auth-pending');
}

function showLoginGate(message, type = 'error') {
  if (isDashboardVisible()) {
    logAuth('showLoginGate blocked (dashboard active)');
    return;
  }

  hideLoading();
  document.body.classList.add('admin-login-page', 'admin-login-ready');
  document.body.classList.remove('admin-authenticated');

  const gate = el('admin-login-gate');
  const shell = el('admin-app-root');
  if (gate) gate.hidden = false;
  if (shell) shell.setAttribute('aria-hidden', 'true');

  const err = el('login-error');
  if (err) {
    err.textContent = message || 'Sign in with your Firebase admin account.';
    err.style.color = type === 'warn' ? '#fbbf24' : '#f87171';
  }

  const hint = el('login-uid-hint');
  if (hint && message?.includes('admins/')) {
    const m = message.match(/admins\/([a-zA-Z0-9]+)/);
    if (m) hint.textContent = `Your UID: ${m[1]}`;
  }

  const status = el('admin-status');
  if (status) status.textContent = '';
}

function showCms(user) {
  sessionLocked = true;
  loginInProgress = false;
  authListenerCooldownUntil = Date.now() + 3000;
  hideLoading();

  document.body.classList.remove('admin-login-page', 'admin-login-ready', 'admin-auth-pending');
  document.body.classList.add('admin-authenticated');

  const gate = el('admin-login-gate');
  const shell = el('admin-app-root');
  if (gate) gate.hidden = true;
  if (shell) shell.removeAttribute('aria-hidden');

  const emailEl = el('admin-user-email');
  if (emailEl && user?.email) emailEl.textContent = user.email;

  const err = el('login-error');
  if (err) err.textContent = '';
  const hint = el('login-uid-hint');
  if (hint) hint.textContent = '';
  const status = el('admin-status');
  if (status) status.textContent = '';

  logAuth('dashboard visible', user?.uid);

  if (!cmsStarted) {
    cmsStarted = true;
    import('./admin-app.mjs')
      .then(({ initAdminApp }) => {
        initAdminApp();
        logAuth('dashboard CMS initialized');
      })
      .catch((e) => {
        console.error('[HAIBO Admin Auth] initAdminApp failure', e);
        if (status) status.textContent = 'Dashboard error — see browser console (F12).';
      });
  }
}

async function handleAuthenticatedUser(user, { fromLogin } = {}) {
  if (!user?.uid) {
    logAuth('auth failure', 'no user after sign-in');
    return { ok: false, error: 'No Firebase user returned. Try again.' };
  }

  try {
    const check = await verifyAdminAccess(user);
    logAuth('firestore admin check', { ok: check.ok, reason: check.reason, uid: user.uid });

    if (!check.ok) {
      logAuth('auth failure', 'unauthorized admin', check.reason);
      sessionLocked = false;
      loginInProgress = false;
      await signOutAdminUser().catch((e) =>
        console.error('[HAIBO Admin Auth] sign-out after failed check', e)
      );
      const msg = messageForAdminFailure(check);
      showLoginGate(msg);
      if (!fromLogin && isDashboardPage()) {
        redirectIfNeeded(false);
      }
      return { ok: false, error: msg };
    }

    sessionLocked = true;
    loginInProgress = false;

    showCms(user);

    if (fromLogin) {
      completeLoginRedirect();
    } else if (isLoginPage()) {
      completeLoginRedirect();
    } else if (!isDashboardPage()) {
      redirectIfNeeded(true);
    }

    logAuth('redirect status', 'dashboard ready', window.location.pathname);
    return { ok: true };
  } catch (err) {
    console.error('[HAIBO Admin Auth] handleAuthenticatedUser error', err);
    sessionLocked = false;
    loginInProgress = false;
    hideLoading();
    const msg = err?.message || 'Could not verify admin session.';
    showLoginGate(msg);
    return { ok: false, error: msg };
  }
}

function resetSubmitButton(form) {
  const submitBtn = form?.querySelector('button[type="submit"]');
  const btnLabel = submitBtn?.querySelector('span');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.removeAttribute('aria-busy');
  }
  if (btnLabel) btnLabel.textContent = 'Sign in to dashboard';
}

/** Bind Firebase login handler (call as early as possible). */
export function bindLoginForm() {
  const form = el('login-form');
  if (!form || form.dataset.haiboBound === '1') return;
  form.dataset.haiboBound = '1';

  form.setAttribute('method', 'post');
  form.setAttribute('action', '#');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    logAuth('submit clicked');

    const errEl = el('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnLabel = submitBtn?.querySelector('span');
    const status = el('admin-status');
    const emailInput = form.querySelector('#email') || form.elements.namedItem('email');
    const passwordInput = form.querySelector('#password') || form.elements.namedItem('password');
    const email = String(emailInput?.value || '').trim();
    const password = String(passwordInput?.value || '');

    if (!globalThis.isFirebaseConfigured?.()) {
      const msg = 'Firebase is not configured. Edit frontend/js/firebase-config.js';
      if (errEl) errEl.textContent = msg;
      return;
    }

    if (errEl) errEl.textContent = '';
    if (status) status.textContent = 'Signing in…';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }
    if (btnLabel) btnLabel.textContent = 'Signing in…';
    showLoadingOverlay('Signing in…');

    if (!email || !password) {
      hideLoading();
      const msg = 'Enter your email and password.';
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.color = '#f87171';
      }
      resetSubmitButton(form);
      return;
    }

    loginInProgress = true;

    try {
      const cred = await signInAdmin(email, password);
      const user = cred?.user ?? getAdminAuth()?.currentUser;
      logAuth('current user UID', user?.uid);

      if (!user) {
        throw new Error('Sign-in succeeded but no user session was returned.');
      }

      if (status) status.textContent = 'Verifying admin access…';
      showLoadingOverlay('Verifying admin access…');

      const result = await handleAuthenticatedUser(user, { fromLogin: true });
      if (!result.ok) {
        if (errEl && result.error) {
          errEl.textContent = result.error;
          errEl.style.color = '#f87171';
        }
        return;
      }

      if (btnLabel) btnLabel.textContent = 'Signed in';
      logAuth('auth success', 'login flow complete');
    } catch (ex) {
      console.error('[HAIBO Admin Auth] auth failure', ex?.code, ex?.message, ex);
      sessionLocked = false;
      const msg = formatAuthError(ex) || ex?.message || 'Sign-in failed.';
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.color = '#f87171';
      }
      showLoginGate(msg);
    } finally {
      loginInProgress = false;
      if (isDashboardVisible()) {
        hideLoading();
      } else {
        hideLoading();
        resetSubmitButton(form);
        if (status) status.textContent = '';
      }
    }
  });

  logAuth('login form listener attached');
}

async function restoreSessionInBackground() {
  try {
    if (loginInProgress || isDashboardVisible()) {
      logAuth('boot skipped', { loginInProgress, sessionLocked });
      return;
    }

    const user = await getRestoredSessionUser();

    if (loginInProgress || isDashboardVisible()) {
      logAuth('boot skipped after restore (login won race)');
      return;
    }

    if (user) {
      const result = await handleAuthenticatedUser(user, { fromLogin: false });
      if (!result.ok && !isDashboardVisible()) {
        showLoginGate(result.error || 'Session expired.');
      }
      return;
    }

    if (isDashboardVisible()) return;

    if (isDashboardPage()) {
      logAuth('redirect status', 'not signed in → login');
      redirectIfNeeded(false);
      return;
    }

    showLoginGate();
  } catch (err) {
    console.error('[HAIBO Admin Auth] boot session error', err);
    if (!isDashboardVisible()) {
      showLoginGate(
        err?.message?.includes('timed out')
          ? 'Authentication timed out. Check your network and try again.'
          : 'Could not start authentication. Refresh the page.',
        'warn'
      );
    }
  } finally {
    hideLoading();
    logAuth('boot session restore finished');
  }
}

function setupAuthListener() {
  if (typeof authListenerUnsub === 'function') return;

  authListenerUnsub = attachAuthListener({
    onSignedIn: async (u) => {
      if (Date.now() < authListenerCooldownUntil) {
        logAuth('auth listener ignored (cooldown)');
        return;
      }
      if (loginInProgress || isDashboardVisible()) {
        logAuth('auth listener ignored (signed-in)', { loginInProgress, sessionLocked });
        return;
      }
      await handleAuthenticatedUser(u, { fromLogin: false });
    },
    onSignedOut: () => {
      if (loginInProgress || Date.now() < authListenerCooldownUntil) {
        logAuth('auth listener ignored (signed-out during login)');
        return;
      }
      if (!sessionLocked) return;
      logAuth('signed out via listener');
      sessionLocked = false;
      cmsStarted = false;
      showLoginGate('You have been signed out.');
      if (isDashboardPage()) {
        redirectIfNeeded(false);
      }
    },
  });
}

export async function bootUnifiedAdmin() {
  if (!globalThis.isFirebaseConfigured?.()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1><p>Edit frontend/js/firebase-config.js</p></div>';
    return;
  }

  if (bootDone) return;
  bootDone = true;

  logAuth('boot', window.location.pathname);

  try {
    getAdminAuth();
    getAdminDb();
    logAuth('Firebase modules ready');
  } catch (err) {
    console.error('[HAIBO Admin Auth] Firebase init error', err);
  }

  bindLoginForm();
  showLoginGate();
  hideLoading();
  setupAuthListener();

  const loadingTimeout = setTimeout(() => {
    if (!isDashboardVisible() && !loginInProgress) {
      hideLoading();
    }
  }, AUTH_BOOT_TIMEOUT_MS);

  restoreSessionInBackground().finally(() => clearTimeout(loadingTimeout));
}

export async function signOutAdmin() {
  loginInProgress = false;
  sessionLocked = false;
  cmsStarted = false;
  authListenerCooldownUntil = 0;
  await signOutAdminUser();
  showLoginGate('You have been signed out.');
  redirectIfNeeded(false);
}
