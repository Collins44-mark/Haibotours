import {
  guardAdminLogin,
  handleAdminLogin,
  formatAuthError,
  resolveDashboardPath,
} from './admin-auth-guard.mjs';
import { ensureAuthReady } from './admin-firebase.mjs';

if (!isFirebaseConfigured()) {
  document.body.innerHTML =
    '<p style="padding:2rem;color:#fff;font-family:sans-serif">Configure firebase-config.js first.</p>';
} else {
  ensureAuthReady();

  guardAdminLogin(() => {
    const form = document.getElementById('login-form');
    const submitBtn = form?.querySelector('button[type="submit"]');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('login-error');
      err.textContent = '';
      if (submitBtn) submitBtn.disabled = true;

      try {
        await handleAdminLogin(e.target.email.value, e.target.password.value);
        window.location.replace(resolveDashboardPath());
      } catch (ex) {
        err.textContent = formatAuthError(ex);
        err.style.color = '#f87171';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}
