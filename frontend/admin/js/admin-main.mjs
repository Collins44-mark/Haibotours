import { guardAdminDashboard } from './admin-auth-guard.mjs';
import { initAdminApp } from './admin-app.mjs';

async function bootAdminDashboard() {
  if (!isFirebaseConfigured()) {
    document.body.innerHTML =
      '<p style="padding:2rem;color:#fff;font-family:sans-serif">Firebase is not configured. Check firebase-config.js</p>';
    return;
  }

  await guardAdminDashboard((user) => {
    const el = document.getElementById('admin-user-email');
    if (el && user?.email) el.textContent = user.email;
    initAdminApp();
  });
}

bootAdminDashboard().catch((err) => {
  console.error('[HAIBO Admin] Dashboard bootstrap failed:', err);
  document.body.classList.remove('admin-auth-pending');
  const loading = document.getElementById('admin-auth-loading');
  if (loading) loading.hidden = true;
});
