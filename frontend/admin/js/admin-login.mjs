import {
  guardAdminLogin,
  handleAdminLogin,
  formatAuthError,
  resolveDashboardPath,
} from './admin-auth-guard.mjs';

function showLoginFormNow() {
  document.body.classList.remove('admin-auth-pending');
  document.body.classList.add('admin-login-ready');
  const loading = document.getElementById('admin-auth-loading');
  if (loading) {
    loading.hidden = true;
    loading.setAttribute('aria-busy', 'false');
  }
}

showLoginFormNow();

async function bootAdminLogin() {
  if (!isFirebaseConfigured()) {
    document.body.innerHTML =
      '<p style="padding:2rem;color:#fff;font-family:sans-serif">Configure firebase-config.js first.</p>';
    return;
  }

  await guardAdminLogin(() => {
    const form = document.getElementById('login-form');
    const submitBtn = form?.querySelector('button[type="submit"]');
    const btnLabel = submitBtn?.querySelector('span');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('login-error');
      err.textContent = '';
      if (submitBtn) submitBtn.disabled = true;
      if (btnLabel) btnLabel.textContent = 'Signing in…';

      try {
        await handleAdminLogin(e.target.email.value, e.target.password.value);
        if (btnLabel) btnLabel.textContent = 'Redirecting…';
        window.location.assign(resolveDashboardPath());
      } catch (ex) {
        console.error('[HAIBO Admin] Sign-in failed:', ex?.code, ex?.message);
        err.textContent = formatAuthError(ex);
        err.style.color = '#f87171';
        if (submitBtn) submitBtn.disabled = false;
        if (btnLabel) btnLabel.textContent = 'Sign in to dashboard';
      }
    });
  });
}

bootAdminLogin().catch((err) => {
  console.error('[HAIBO Admin] Login page bootstrap failed:', err);
  showLoginFormNow();
  const errEl = document.getElementById('login-error');
  if (errEl) {
    errEl.textContent =
      formatAuthError(err) || 'Could not start authentication. Refresh and try again.';
    errEl.style.color = '#f87171';
  }
});
