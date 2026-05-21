/**
 * Admin login + dashboard on one page.
 * Session lock: after sign-in, ignore Firebase null ticks until Logout.
 */
import { ensureAuthReady, adminLogin, adminLogout, getAdminAuth } from './admin-firebase.mjs';
import { ensureAdminRecord, formatAuthError } from './admin-auth-guard.mjs';
import { initAdminApp } from './admin-app.mjs';

let cmsStarted = false;
/** When true, never show login overlay (until explicit logout) */
let sessionLocked = false;

function el(id) {
  return document.getElementById(id);
}

function hideLoading() {
  const loading = el('admin-auth-loading');
  if (loading) {
    loading.hidden = true;
    loading.setAttribute('aria-busy', 'false');
  }
}

function setStatus(text) {
  const s = el('admin-status');
  if (s) s.textContent = text || '';
}

function showLoginGate(message, type = 'error') {
  if (sessionLocked) return;

  hideLoading();
  document.body.classList.add('admin-login-page', 'admin-login-ready');
  document.body.classList.remove('admin-authenticated');

  const gate = el('admin-login-gate');
  const shell = el('admin-app-root');
  if (gate) gate.hidden = false;
  if (shell) shell.setAttribute('aria-hidden', 'true');

  const err = el('login-error');
  if (err) {
    err.textContent = message || 'Please sign in with your Firebase admin email and password.';
    err.style.color = type === 'warn' ? '#fbbf24' : '#f87171';
  }
  setStatus('');
}

function showCms(user) {
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

  if (!cmsStarted) {
    cmsStarted = true;
    try {
      initAdminApp();
    } catch (e) {
      console.error('[HAIBO Admin] initAdminApp:', e);
      setStatus('Dashboard loaded with errors — check console (F12).');
    }
  }

  setStatus('');
}

function bindLoginForm() {
  const form = el('login-form');
  if (!form || form.dataset.haiboBound === '1') return;
  form.dataset.haiboBound = '1';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = el('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnLabel = submitBtn?.querySelector('span');

    if (errEl) errEl.textContent = '';
    if (submitBtn) submitBtn.disabled = true;
    if (btnLabel) btnLabel.textContent = 'Signing in…';
    setStatus('Connecting to Firebase…');

    try {
      const cred = await adminLogin(form.email.value, form.password.value);
      if (!cred?.user) {
        throw new Error('Sign-in succeeded but no user was returned.');
      }

      if (btnLabel) btnLabel.textContent = 'Opening dashboard…';
      showCms(cred.user);

      ensureAdminRecord(cred.user).then((r) => {
        if (!r.ok) {
          setStatus(
            'Signed in. Publish Firestore rules in Firebase Console to enable saving (see firebase/firestore.rules).'
          );
        }
      });
    } catch (ex) {
      console.error('[HAIBO Admin] Sign-in failed:', ex?.code, ex?.message, ex);
      sessionLocked = false;
      const msg =
        formatAuthError(ex) ||
        ex?.message ||
        'Sign-in failed. Check email/password and Firebase Authentication.';
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.color = '#f87171';
      }
      showLoginGate(msg);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (btnLabel && !document.body.classList.contains('admin-authenticated')) {
        btnLabel.textContent = 'Sign in to dashboard';
      }
    }
  });
}

async function restoreSessionIfAny() {
  const auth = getAdminAuth();
  const user = auth?.currentUser;
  if (!user) return false;

  showCms(user);
  ensureAdminRecord(user).catch(() => {});
  return true;
}

export async function bootUnifiedAdmin() {
  if (!globalThis.isFirebaseConfigured?.()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1><p>Edit frontend/js/firebase-config.js</p></div>';
    return;
  }

  bindLoginForm();
  showLoginGate();

  try {
    await Promise.race([
      ensureAuthReady(10000),
      new Promise((r) => setTimeout(r, 10000)),
    ]);
    const restored = await restoreSessionIfAny();
    if (!restored) {
      showLoginGate();
    }
  } catch (err) {
    console.error('[HAIBO Admin] Boot error:', err);
    showLoginGate('Could not connect to Firebase. Check internet and refresh.', 'warn');
  }
}

export async function signOutAdmin() {
  sessionLocked = false;
  cmsStarted = false;
  try {
    await adminLogout();
  } finally {
    showLoginGate('You have been signed out.');
  }
}
