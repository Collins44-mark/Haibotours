import { bindLoginForm, bootUnifiedAdmin } from './admin-shell.mjs';
import { getAdminAuth, getAdminDb } from './admin-firebase.mjs';

/* Warm up Firebase before first sign-in click */
if (globalThis.isFirebaseConfigured?.()) {
  try {
    getAdminAuth();
    getAdminDb();
  } catch (err) {
    console.warn('[HAIBO Admin] Firebase warmup:', err);
  }
}

/* Attach before async boot so submit never uses native GET navigation */
bindLoginForm();

bootUnifiedAdmin().catch((err) => {
  console.error('[HAIBO Admin] Bootstrap failed:', err);
  const loading = document.getElementById('admin-auth-loading');
  if (loading) loading.hidden = true;
  const gate = document.getElementById('admin-login-gate');
  if (gate) gate.hidden = false;
  document.body.classList.add('admin-login-page', 'admin-login-ready');
  document.body.classList.remove('admin-auth-pending');
  const errEl = document.getElementById('login-error');
  if (errEl) {
    errEl.textContent =
      'Admin failed to start. Hard refresh (Cmd+Shift+R). If it persists, check the browser console.';
    errEl.style.color = '#f87171';
  }
});
