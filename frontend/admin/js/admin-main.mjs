import { bootUnifiedAdmin } from './admin-shell.mjs';

bootUnifiedAdmin().catch((err) => {
  console.error('[HAIBO Admin] Bootstrap failed:', err);
  document.body.classList.remove('admin-auth-pending');
  const loading = document.getElementById('admin-auth-loading');
  if (loading) loading.hidden = true;
  const gate = document.getElementById('admin-login-gate');
  if (gate) gate.hidden = false;
});
