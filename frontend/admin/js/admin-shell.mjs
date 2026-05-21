/**
 * Admin UI shell — unified SPA (/admin, /admin-login → same index.html).
 * Auth: single onAuthStateChanged, no redirect loops, dashboard mounts once after verify.
 */
import {
  verifyAdminAccess,
  signInAdmin,
  signOutAdminUser,
  messageForAdminFailure,
  formatAuthError,
  logAuth,
} from './admin-auth.mjs';
import { ensureAuthReady, getAdminAuth, getAdminDb, onAuthStateChanged } from './admin-firebase.mjs';

let bootDone = false;
let authListenerAttached = false;
let loginInProgress = false;
let verifyInProgress = false;
let cmsStarted = false;
/** Verified admin Firebase UID; null = show login */
let sessionUid = null;

function el(id) {
  return document.getElementById(id);
}

function isUnifiedSpa() {
  return Boolean(el('admin-login-gate') && el('admin-app-root'));
}

function isDashboardVisible() {
  return Boolean(sessionUid) && document.body.classList.contains('admin-authenticated');
}

function hideLoading() {
  const loading = el('admin-auth-loading');
  if (loading) {
    loading.hidden = true;
    loading.setAttribute('aria-busy', 'false');
  }
  document.body.classList.remove('admin-auth-pending', 'admin-signing-in');
}

function showLoadingOverlay(message) {
  const loading = el('admin-auth-loading');
  if (loading) {
    loading.hidden = false;
    loading.style.display = '';
    loading.setAttribute('aria-busy', 'true');
    const msg = loading.querySelector('[data-auth-loading-msg]');
    if (msg) msg.textContent = message || 'Signing in…';
  }
  document.body.classList.add('admin-signing-in', 'admin-auth-pending');
}

function showLoginGate(message, type = 'error') {
  if (isDashboardVisible()) {
    logAuth('showLoginGate blocked (dashboard active)', sessionUid);
    return;
  }

  hideLoading();
  document.body.classList.add('admin-login-page', 'admin-login-ready');
  document.body.classList.remove('admin-authenticated');

  const gate = el('admin-login-gate');
  const shell = el('admin-app-root');
  if (gate) {
    gate.hidden = false;
    gate.removeAttribute('hidden');
  }
  if (shell) shell.setAttribute('aria-hidden', 'true');

  const err = el('login-error');
  if (err) {
    err.textContent = message || '';
    err.style.color = type === 'warn' ? '#fbbf24' : message ? '#f87171' : '';
  }

  const hint = el('login-uid-hint');
  if (hint && message?.includes('admins/')) {
    const m = message.match(/admins\/([a-zA-Z0-9]+)/);
    if (m) hint.textContent = `Your UID: ${m[1]}`;
  }

  const status = el('admin-status');
  if (status) status.textContent = '';
}

function syncDashboardUrl() {
  if (!isUnifiedSpa()) return;
  const target = '/admin';
  const current = (window.location.pathname || '/').replace(/\/$/, '') || '/';
  if (current === target || current === '/admin-dashboard') return;
  window.history.replaceState(null, '', target);
  logAuth('redirect event', 'replaceState → /admin (no reload)');
}

function mountDashboard(user) {
  if (cmsStarted && sessionUid === user?.uid) {
    logAuth('dashboard mount skipped (already mounted)', user?.uid);
    return;
  }

  sessionUid = user.uid;
  loginInProgress = false;

  document.body.classList.remove(
    'admin-login-page',
    'admin-login-ready',
    'admin-auth-pending',
    'admin-signing-in'
  );
  document.body.classList.add('admin-authenticated');
  hideLoading();

  const gate = el('admin-login-gate');
  const shell = el('admin-app-root');
  if (gate) gate.hidden = true;
  if (shell) shell.removeAttribute('aria-hidden');

  const emailEl = el('admin-user-email');
  if (emailEl && user?.email) emailEl.textContent = user.email;

  el('login-error') && (el('login-error').textContent = '');
  const hint = el('login-uid-hint');
  if (hint) hint.textContent = '';
  const status = el('admin-status');
  if (status) status.textContent = '';

  try {
    sessionStorage.setItem('haibo_admin_uid', user.uid);
  } catch {
    /* ignore */
  }

  syncDashboardUrl();
  logAuth('dashboard mount', user.uid);

  if (!cmsStarted) {
    cmsStarted = true;
    import('./admin-app.mjs')
      .then(({ initAdminApp }) => {
        initAdminApp();
        logAuth('dashboard CMS initialized (once)');
      })
      .catch((e) => {
        cmsStarted = false;
        console.error('[HAIBO Admin Auth] initAdminApp failure', e);
        if (status) status.textContent = 'Dashboard error — see browser console (F12).';
      });
  }
}

async function establishSession(user, { fromLogin = false } = {}) {
  if (!user?.uid) {
    logAuth('auth failure', 'no user');
    return { ok: false, error: 'No Firebase user.' };
  }

  if (sessionUid === user.uid && isDashboardVisible()) {
    logAuth('session already active', user.uid);
    return { ok: true };
  }

  if (verifyInProgress) {
    logAuth('verify skipped (in progress)');
    return { ok: false, error: 'Verification in progress.' };
  }

  verifyInProgress = true;
  try {
    const status = el('admin-status');
    if (status && !fromLogin) status.textContent = 'Verifying admin access…';

    const check = await verifyAdminAccess(user);
    logAuth('firestore admin check', { ok: check.ok, reason: check.reason, uid: user.uid });

    if (!check.ok) {
      sessionUid = null;
      cmsStarted = false;
      try {
        sessionStorage.removeItem('haibo_admin_uid');
      } catch {
        /* ignore */
      }
      await signOutAdminUser().catch((e) =>
        console.error('[HAIBO Admin Auth] sign-out after failed check', e)
      );
      const msg = messageForAdminFailure(check);
      showLoginGate(msg);
      return { ok: false, error: msg };
    }

    if (fromLogin) {
      logAuth('login success', user.uid, user.email);
    }

    mountDashboard(user);
    return { ok: true };
  } catch (err) {
    console.error('[HAIBO Admin Auth] establishSession error', err);
    sessionUid = null;
    showLoginGate(err?.message || 'Could not verify admin session.');
    return { ok: false, error: err?.message };
  } finally {
    verifyInProgress = false;
  }
}

function handleAuthStateChange(user) {
  logAuth('auth state change', user?.uid || 'signed-out');

  if (loginInProgress) {
    logAuth('auth state ignored (login in progress)');
    return;
  }

  if (!user) {
    if (sessionUid) {
      logAuth('signed out');
      sessionUid = null;
      cmsStarted = false;
      try {
        sessionStorage.removeItem('haibo_admin_uid');
      } catch {
        /* ignore */
      }
    }
    showLoginGate();
    return;
  }

  if (sessionUid === user.uid && isDashboardVisible()) {
    return;
  }

  void establishSession(user);
}

function attachAuthListenerOnce() {
  if (authListenerAttached) return;
  const auth = getAdminAuth();
  if (!auth) {
    showLoginGate('Firebase Auth is not available.');
    return;
  }

  authListenerAttached = true;
  logAuth('auth listener attached (once)');

  onAuthStateChanged(auth, (user) => {
    handleAuthStateChange(user);
  });
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

      const result = await establishSession(user, { fromLogin: true });
      if (!result.ok) {
        if (errEl && result.error) {
          errEl.textContent = result.error;
          errEl.style.color = '#f87171';
        }
        return;
      }

      if (btnLabel) btnLabel.textContent = 'Signed in';
      logAuth('login flow complete');
    } catch (ex) {
      console.error('[HAIBO Admin Auth] auth failure', ex?.code, ex?.message, ex);
      sessionUid = null;
      const msg = formatAuthError(ex) || ex?.message || 'Sign-in failed.';
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.color = '#f87171';
      }
      showLoginGate(msg);
    } finally {
      loginInProgress = false;
      hideLoading();
      if (!isDashboardVisible()) {
        resetSubmitButton(form);
        if (status) status.textContent = '';
      }
    }
  });

  logAuth('login form listener attached');
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

export function bootUnifiedAdmin() {
  if (!globalThis.isFirebaseConfigured?.()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1><p>Edit frontend/js/firebase-config.js</p></div>';
    return;
  }

  if (bootDone) {
    logAuth('boot skipped (already started)');
    return;
  }
  bootDone = true;

  logAuth('boot', window.location.pathname, { unifiedSpa: isUnifiedSpa() });

  try {
    getAdminAuth();
    getAdminDb();
    logAuth('Firebase modules ready');
  } catch (err) {
    console.error('[HAIBO Admin Auth] Firebase init error', err);
  }

  bindLoginForm();

  document.body.classList.add('admin-auth-pending');
  hideLoading();

  void (async () => {
    try {
      await ensureAuthReady();
      attachAuthListenerOnce();
      logAuth('boot complete — waiting for auth state');
    } catch (err) {
      console.error('[HAIBO Admin Auth] boot error', err);
      document.body.classList.remove('admin-auth-pending');
      showLoginGate('Could not start authentication. Refresh and try again.', 'warn');
    }
  })();
}

export async function signOutAdmin() {
  loginInProgress = false;
  sessionUid = null;
  cmsStarted = false;
  try {
    sessionStorage.removeItem('haibo_admin_uid');
  } catch {
    /* ignore */
  }
  await signOutAdminUser();
  showLoginGate('You have been signed out.');
  logAuth('sign-out complete (no redirect)');
}
