import { guardAdminDashboard } from './admin-auth-guard.mjs';
import { initAdminApp } from './admin-app.mjs';

if (!isFirebaseConfigured()) {
  document.body.innerHTML =
    '<p style="padding:2rem;color:#fff;font-family:sans-serif">Firebase is not configured. Check firebase-config.js</p>';
} else {
  guardAdminDashboard(() => {
    initAdminApp();
  });
}
