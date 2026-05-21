/**
 * Admin UI shell — login overlay + dashboard on one document (/admin).
 */
import {
  waitForInitialAuthState,
  verifyAdminAccess,
  signInAdmin,
  signOutAdminUser,
  redirectIfNeeded,
  attachAuthListener,
  messageForAdminFailure,
  formatAuthError,
  logAuth,
  isLoginPage,
  isDashboardPage,
} from './admin-auth.mjs';
const AUTH_BOOT_TIMEOUT_MS = 17000;

let cmsStarted = false;
let sessionLocked = false;
let bootDone = false;

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

  el('admin-status') && (el('admin-status').textContent = '');
}

async function showCms(user) {
  sessionLocked = true;
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
    try {
      const { initAdminApp } = await import('./admin-app.mjs');
      initAdminApp();
    } catch (e) {
      console.error('[HAIBO Admin] initAdminApp:', e);
      if (status) status.textContent = 'Dashboard error — see browser console (F12).';
    }
  }
}

async function handleAuthenticatedUser(user, { fromLogin } = {}) {
  if (!user) return false;

  const check = await verifyAdminAccess(user);
  logAuth('handleAuthenticatedUser', { fromLogin, check: check.ok, reason: check.reason });

  if (!check.ok) {
    logAuth('firestore admin check failed', check.reason, check.uid);
    sessionLocked = false;
    await signOutAdminUser();
    const notAdminMsg = messageForAdminFailure(check);
    showLoginGate(notAdminMsg);
    if (!fromLogin) redirectIfNeeded(false);
    return false;
  }

  logAuth('firestore admin check passed', check.uid);

  sessionLocked = true;

  if (fromLogin || isLoginPage() || window.location.pathname.includes('admin-login')) {
    redirectIfNeeded(true);
  }

  await showCms(user);
  return true;
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

    logAuth('submit triggered');

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
    if (submitBtn) submitBtn.disabled = true;
    if (btnLabel) btnLabel.textContent = 'Signing in…';

    if (!email || !password) {
      const msg = 'Enter your email and password.';
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.color = '#f87171';
      }
      if (submitBtn) submitBtn.disabled = false;
      if (btnLabel) btnLabel.textContent = 'Sign in to dashboard';
      if (status) status.textContent = '';
      return;
    }

    try {
      const cred = await signInAdmin(email, password);
      if (status) status.textContent = 'Verifying admin access…';

      const ok = await handleAuthenticatedUser(cred.user, { fromLogin: true });
      if (!ok) return;

      logAuth('redirect success', window.location.pathname);
      if (btnLabel) btnLabel.textContent = 'Signed in';
    } catch (ex) {
      console.error('[HAIBO Admin] Sign-in failed:', ex?.code, ex?.message);
      sessionLocked = false;
      const msg = formatAuthError(ex) || ex?.message || 'Sign-in failed.';
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.color = '#f87171';
      }
      showLoginGate(msg);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (status && !document.body.classList.contains('admin-authenticated')) {
        status.textContent = '';
      }
      if (btnLabel && !document.body.classList.contains('admin-authenticated')) {
        btnLabel.textContent = 'Sign in to dashboard';
      }
    }
  });

  logAuth('login form listener attached');
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

  const loadingTimeout = setTimeout(() => {
    if (!sessionLocked) {
      hideLoading();
      showLoginGate('Still connecting… You can sign in below.', 'warn');
    }
  }, AUTH_BOOT_TIMEOUT_MS);

  try {
    const user = await waitForInitialAuthState();

    if (user) {
      await handleAuthenticatedUser(user, { fromLogin: false });
    } else {
      if (isDashboardPage()) {
        redirectIfNeeded(false);
      }
      showLoginGate();
    }

    attachAuthListener({
      onSignedIn: async (u) => {
        if (!sessionLocked) await handleAuthenticatedUser(u, { fromLogin: false });
      },
      onSignedOut: () => {
        if (!sessionLocked) return;
        logAuth('signed out via listener');
        sessionLocked = false;
        cmsStarted = false;
        showLoginGate('You have been signed out.');
        redirectIfNeeded(false);
      },
    });
  } catch (err) {
    console.error('[HAIBO Admin] Boot error:', err);
    showLoginGate('Could not start authentication. Refresh the page.', 'warn');
  } finally {
    clearTimeout(loadingTimeout);
    hideLoading();
  }
}

export async function signOutAdmin() {
  sessionLocked = false;
  cmsStarted = false;
  await signOutAdminUser();
  showLoginGate('You have been signed out.');
  redirectIfNeeded(false);
}
