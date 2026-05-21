/**
 * Admin UI shell — login overlay + dashboard on one document (/admin).
 */
import {
  waitForInitialAuthState,
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

const AUTH_BOOT_TIMEOUT_MS = 12000;

let cmsStarted = false;
let sessionLocked = false;
let bootDone = false;
let loginInProgress = false;
let authListenerUnsub = null;

function el(id) {
  return document.getElementById(id);
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
  if (sessionLocked) {
    logAuth('showLoginGate blocked (session locked)');
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

  if (!cmsStarted) {
    cmsStarted = true;
    logAuth('opening dashboard CMS');
    import('./admin-app.mjs')
      .then(({ initAdminApp }) => {
        initAdminApp();
        logAuth('dashboard CMS initialized');
      })
      .catch((e) => {
        console.error('[HAIBO Admin] initAdminApp:', e);
        if (status) status.textContent = 'Dashboard error — see browser console (F12).';
      });
  }
}

async function handleAuthenticatedUser(user, { fromLogin } = {}) {
  if (!user) return false;

  try {
    const check = await verifyAdminAccess(user);
    logAuth('handleAuthenticatedUser', { fromLogin, ok: check.ok, reason: check.reason });

    if (!check.ok) {
      logAuth('errors', 'not admin', check.reason);
      sessionLocked = false;
      loginInProgress = false;
      await signOutAdminUser().catch((e) =>
        console.error('[HAIBO Admin Auth] sign-out after failed check', e)
      );
      showLoginGate(messageForAdminFailure(check));
      if (!fromLogin) redirectIfNeeded(false);
      return false;
    }

    sessionLocked = true;
    loginInProgress = false;

    showCms(user);

    if (fromLogin || isLoginPage() || window.location.pathname.includes('admin-login')) {
      completeLoginRedirect();
    } else {
      redirectIfNeeded(true);
    }

    return true;
  } catch (err) {
    console.error('[HAIBO Admin Auth] handleAuthenticatedUser error', err);
    sessionLocked = false;
    loginInProgress = false;
    hideLoading();
    showLoginGate(err?.message || 'Could not verify admin session.');
    return false;
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

    if (errEl) errEl.textContent = '';
    if (status) status.textContent = 'Signing in…';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }
    if (btnLabel) btnLabel.textContent = 'Signing in…';
    showLoadingOverlay('Signing in…');

    if (!email || !password) {
      loginInProgress = false;
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
      if (status) status.textContent = 'Verifying admin access…';
      showLoadingOverlay('Verifying admin access…');

      const ok = await handleAuthenticatedUser(cred.user, { fromLogin: true });
      if (!ok) {
        logAuth('errors', 'login rejected after admin check');
        return;
      }

      if (btnLabel) btnLabel.textContent = 'Signed in';
    } catch (ex) {
      console.error('[HAIBO Admin Auth] errors', ex?.code, ex?.message, ex);
      sessionLocked = false;
      const msg = formatAuthError(ex) || ex?.message || 'Sign-in failed.';
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.color = '#f87171';
      }
      showLoginGate(msg);
    } finally {
      loginInProgress = false;
      hideLoading();
      if (!document.body.classList.contains('admin-authenticated')) {
        resetSubmitButton(form);
        if (status) status.textContent = '';
      }
    }
  });

  logAuth('login form listener attached');
}

async function restoreSessionInBackground() {
  try {
    logAuth('boot session restore started');
    const user = await waitForInitialAuthState();

    if (loginInProgress) {
      logAuth('boot skipped (login in progress)');
      return;
    }

    if (user) {
      await handleAuthenticatedUser(user, { fromLogin: false });
    } else {
      if (isDashboardPage()) {
        redirectIfNeeded(false);
      }
      showLoginGate();
    }
  } catch (err) {
    console.error('[HAIBO Admin Auth] boot session error', err);
    showLoginGate('Could not start authentication. Refresh the page.', 'warn');
  } finally {
    hideLoading();
    logAuth('boot session restore finished');
  }
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
  bindLoginForm();
  showLoginGate();
  hideLoading();

  if (typeof authListenerUnsub !== 'function') {
    authListenerUnsub = attachAuthListener({
      onSignedIn: async (u) => {
        if (loginInProgress || sessionLocked) {
          logAuth('auth listener ignored (signed-in)', { loginInProgress, sessionLocked });
          return;
        }
        await handleAuthenticatedUser(u, { fromLogin: false });
      },
      onSignedOut: () => {
        if (loginInProgress) {
          logAuth('auth listener ignored (signed-out during login)');
          return;
        }
        if (!sessionLocked) return;
        logAuth('signed out via listener');
        sessionLocked = false;
        cmsStarted = false;
        showLoginGate('You have been signed out.');
        redirectIfNeeded(false);
      },
    });
  }

  const loadingTimeout = setTimeout(() => {
    if (!sessionLocked && !loginInProgress) {
      hideLoading();
    }
  }, AUTH_BOOT_TIMEOUT_MS);

  restoreSessionInBackground().finally(() => clearTimeout(loadingTimeout));
}

export async function signOutAdmin() {
  loginInProgress = false;
  sessionLocked = false;
  cmsStarted = false;
  await signOutAdminUser();
  showLoginGate('You have been signed out.');
  redirectIfNeeded(false);
}
