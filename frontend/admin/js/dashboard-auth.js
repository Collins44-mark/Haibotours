/**
 * HAIBO Admin dashboard — one auth listener, verify admin, mount CMS once.
 */
import {
  getAuth,
  checkUserIsAdmin,
  signOutAdmin,
  onAuthStateChanged,
  LOGIN_URL,
  log,
} from './firebase.js';
import { initAdminApp } from './admin-app.mjs';

const loadingEl = document.getElementById('admin-auth-loading');
const shell = document.getElementById('admin-app-root');
let cmsStarted = false;
let redirecting = false;
let sessionUid = null;

function goLogin() {
  if (redirecting) return;
  redirecting = true;
  log('redirect event → login');
  window.location.replace(LOGIN_URL);
}

function showDashboard(user) {
  if (loadingEl) loadingEl.hidden = true;
  if (shell) shell.hidden = false;
  document.body.classList.add('admin-ready');

  const emailEl = document.getElementById('admin-user-email');
  if (emailEl && user?.email) emailEl.textContent = user.email;

  if (cmsStarted) return;
  cmsStarted = true;
  log('dashboard mount', user.uid);
  initAdminApp();
  log('dashboard CMS initialized');
}

async function handleUser(user) {
  if (!user) {
    if (sessionUid || cmsStarted) goLogin();
    else goLogin();
    return;
  }

  if (sessionUid === user.uid && cmsStarted) return;

  const isAdmin = await checkUserIsAdmin(user);
  if (!isAdmin) {
    log('auth failure — unauthorized', user.uid);
    await signOutAdmin();
    goLogin();
    return;
  }

  sessionUid = user.uid;
  showDashboard(user);
}

async function boot() {
  if (!globalThis.isFirebaseConfigured?.()) {
    document.body.innerHTML =
      '<p style="padding:2rem;color:#fff;font-family:sans-serif">Firebase not configured.</p>';
    return;
  }

  const auth = getAuth();
  if (!auth) {
    goLogin();
    return;
  }

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }

  log('auth listener attached (once)');

  onAuthStateChanged(auth, (user) => {
    log('auth state change', user?.uid || 'signed-out');
    void handleUser(user);
  });
}

void boot();
