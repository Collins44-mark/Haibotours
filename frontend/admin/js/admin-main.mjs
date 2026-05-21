import { bootUnifiedAdmin } from './admin-shell.mjs';

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
