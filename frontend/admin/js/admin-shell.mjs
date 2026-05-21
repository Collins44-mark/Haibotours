/**
 * Unified admin — login + dashboard on ONE page (no redirect after sign-in).
 */
import {
  ensureAuthReady,
  adminLogin,
  adminLogout,
  getAdminAuth,
  onAuthStateChanged,
} from './admin-firebase.mjs';
import { checkIsAdminUser, formatAuthError } from './admin-auth-guard.mjs';
import { initAdminApp } from './admin-app.mjs';

let cmsStarted = false;
let authHooked = false;
let activeUid = null;
/** Ignore brief null auth ticks right after sign-in */
let ignoreSignedOutUntil = 0;

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

function showLoginGate(message, type = 'error') {
  hideLoading();
  document.body.classList.add('admin-login-page', 'admin-login-ready');
  document.body.classList.remove('admin-authenticated');

  const gate = el('admin-login-gate');
  const shell = el('admin-app-root');
  if (gate) gate.hidden = false;
  if (shell) shell.setAttribute('aria-hidden', 'true');

  const err = el('login-error');
  if (err) {
    err.textContent = message || '';
    err.style.color = type === 'warn' ? '#fbbf24' : message ? '#f87171' : '';
  }
}

function showCms(user) {
  hideLoading();
  activeUid = user?.uid || null;
  ignoreSignedOutUntil = Date.now() + 8000;

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

  if (!cmsStarted) {
    cmsStarted = true;
    initAdminApp();
  }
}

async function processUser(user) {
  if (!user) {
    if (Date.now() < ignoreSignedOutUntil) {
      return;
    }
    activeUid = null;
    showLoginGate();
    return;
  }

  if (activeUid === user.uid && document.body.classList.contains('admin-authenticated')) {
    return;
  }

  const adminResult = await checkIsAdminUser(user);
  if (!adminResult.ok) {
    const uid = user.uid || '';
    let msg =
      adminResult.reason === 'permission-denied'
        ? 'Firestore rules blocked admin setup. Deploy firebase/firestore.rules (admins create rule).'
        : `Could not verify admin access for UID: ${uid}. In Firestore create admins/${uid} or deploy updated rules.`;
    if (adminResult.reason === 'provision-failed') {
      msg = `Could not create admins/${uid}. Deploy firestore.rules then sign in again. (${adminResult.error?.code || 'error'})`;
    }
    const hint = el('login-uid-hint');
    if (hint) hint.textContent = uid ? `Your Firebase UID: ${uid}` : '';
    showLoginGate(msg);
    return;
  }

  const hint = el('login-uid-hint');
  if (hint) hint.textContent = '';
  showCms(user);
}

function hookAuthListener() {
  if (authHooked) return;
  authHooked = true;
  const auth = getAdminAuth();
  if (!auth) return;
  onAuthStateChanged(auth, (user) => {
    processUser(user);
  });
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

    try {
      const cred = await adminLogin(form.email.value, form.password.value);
      ignoreSignedOutUntil = Date.now() + 10000;
      if (btnLabel) btnLabel.textContent = 'Opening dashboard…';
      await processUser(cred.user);
    } catch (ex) {
      console.error('[HAIBO Admin] Sign-in failed:', ex?.code, ex?.message);
      if (errEl) {
        errEl.textContent = formatAuthError(ex);
        errEl.style.color = '#f87171';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (btnLabel && !document.body.classList.contains('admin-authenticated')) {
        btnLabel.textContent = 'Sign in to dashboard';
      }
    }
  });
}

export async function bootUnifiedAdmin() {
  if (!globalThis.isFirebaseConfigured?.()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1><p>Edit frontend/js/firebase-config.js</p></div>';
    return;
  }

  bindLoginForm();
  showLoginGate();
  hookAuthListener();

  try {
    await Promise.race([
      ensureAuthReady(8000),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
    const auth = getAdminAuth();
    if (auth?.currentUser) {
      await processUser(auth.currentUser);
    }
  } catch (err) {
    console.error('[HAIBO Admin] Boot error:', err);
    showLoginGate('Could not connect to Firebase. Check network and refresh.', 'warn');
  }
}

/** Sign out without leaving /admin */
export async function signOutAdmin() {
  cmsStarted = false;
  activeUid = null;
  ignoreSignedOutUntil = 0;
  await adminLogout();
}
