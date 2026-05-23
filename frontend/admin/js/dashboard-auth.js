/**
 * HAIBO Admin dashboard — simple auth then mount CMS.
 */
import { log } from './firebase.js';
import { protectAdminPage } from './admin-gate.mjs';
import { initAdminApp } from './admin-app.mjs';

const shell = document.getElementById('admin-app-root');
let cmsStarted = false;

function showDashboard(user) {
  if (shell) shell.hidden = false;

  const emailEl = document.getElementById('admin-user-email');
  if (emailEl && user?.email) emailEl.textContent = user.email;

  if (cmsStarted) return;
  cmsStarted = true;
  log('dashboard mount', user.uid);
  initAdminApp();
}

protectAdminPage((user) => {
  showDashboard(user);
});
