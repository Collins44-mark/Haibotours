/**
 * HAIBO Admin dashboard — auth gate then mount CMS once.
 */
import { log } from './firebase.js';
import { runAdminAuthGate } from './admin-auth-boot.mjs';
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
  log('dashboard CMS initialized');
}

runAdminAuthGate((user) => {
  showDashboard(user);
});
