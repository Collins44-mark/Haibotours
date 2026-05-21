/**
 * Unified admin — login + dashboard on ONE page (no redirect after sign-in).
 */
import {
  ensureAuthReady,
  adminLogin,
  adminLogout,
  watchAdminAuth,
  getAdminAuth,
} from './admin-firebase.mjs';
import { checkIsAdminUser, formatAuthError } from './admin-auth-guard.mjs';
import { initAdminApp } from './admin-app.mjs';

let cmsStarted = false;
let authHooked = false;

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
  hideLoading();
  document.body.classList.add('admin-auth-pending', 'admin-login-page', 'admin-login-ready');
  document.body.classList.remove('admin-authenticated');

  const gate = el('admin-login-gate');
  const shell = el('admin-app-root');
  if (gate) gate.hidden = false;
  if (shell) {
    shell.setAttribute('aria-hidden', 'true');
  }

  const err = el('login-error');
  if (err) {
    err.textContent = message || '';
    err.style.color = type === 'warn' ? '#fbbf24' : message ? '#f87171' : '';
  }
}

function showCms(user) {
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

  if (!cmsStarted) {
    cmsStarted = true;
    initAdminApp();
  }
}

async function processUser(user) {
  if (!user) {
    showLoginGate();
    return;
  }

  const adminResult = await checkIsAdminUser(user);
  if (!adminResult.ok) {
    const msg =
      adminResult.reason === 'permission-denied'
        ? 'Firestore rules blocked admin check. Deploy firebase/firestore.rules to project haibo-tours.'
        : `Not authorized. In Firestore Database create: admins/${user.uid} (document ID = your Authentication UID, not email).`;
    try {
      await adminLogout();
    } catch {
      /* ignore */
    }
    showLoginGate(msg);
    return;
  }

  showCms(user);
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
  if (!isFirebaseConfigured()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1><p>Edit frontend/js/firebase-config.js</p></div>';
    return;
  }

  bindLoginForm();

  try {
    await ensureAuthReady(15000);
  } catch (err) {
    console.warn('[HAIBO Admin] Auth ready:', err);
  }

  if (!authHooked) {
    authHooked = true;
    watchAdminAuth((user) => {
      processUser(user);
    });
  }

  const auth = getAdminAuth();
  if (auth?.currentUser) {
    await processUser(auth.currentUser);
  } else {
    showLoginGate();
  }
}

/** Sign out without leaving /admin */
export async function signOutAdmin() {
  cmsStarted = false;
  await adminLogout();
}
