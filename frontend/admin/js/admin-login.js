/**
 * HAIBO Admin login page — sign in, verify admins/{uid}, go to dashboard.
 */
import {
  getAuth,
  signInAdmin,
  signOutAdmin,
  checkUserIsAdmin,
  DASHBOARD_URL,
  log,
} from './firebase.js';

const UNAUTHORIZED_MSG = 'Unauthorized admin access';

const form = document.getElementById('login-form');
const errEl = document.getElementById('login-error');
const submitBtn = form?.querySelector('button[type="submit"]');
const btnLabel = submitBtn?.querySelector('span');

function showError(message) {
  if (errEl) {
    errEl.textContent = message || '';
    errEl.style.color = message ? '#f87171' : '';
  }
}

function setBusy(busy) {
  if (submitBtn) {
    submitBtn.disabled = busy;
    submitBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
  }
  if (btnLabel) btnLabel.textContent = busy ? 'Signing in…' : 'Sign in to dashboard';
}

/** Already signed in as admin → dashboard (one check, no listener). */
async function redirectIfAlreadyAdmin() {
  const auth = getAuth();
  if (!auth) return;
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  const user = auth.currentUser;
  if (!user) return;
  if (await checkUserIsAdmin(user)) {
    log('redirect event → dashboard (existing session)');
    window.location.replace(DASHBOARD_URL);
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showError('');

  if (!globalThis.isFirebaseConfigured?.()) {
    showError('Firebase is not configured. Edit frontend/js/firebase-config.js');
    return;
  }

  const email = String(form.querySelector('#email')?.value || '').trim();
  const password = String(form.querySelector('#password')?.value || '');
  if (!email || !password) {
    showError('Enter your email and password.');
    return;
  }

  setBusy(true);
  log('login attempt', email);

  try {
    const cred = await signInAdmin(email, password);
    const user = cred.user;
    log('login success', user.uid);

    const isAdmin = await checkUserIsAdmin(user);
    if (!isAdmin) {
      await signOutAdmin();
      showError(UNAUTHORIZED_MSG);
      log('auth failure — not in admins collection');
      return;
    }

    log('redirect event → dashboard');
    window.location.replace(DASHBOARD_URL);
  } catch (err) {
    console.error('[HAIBO Admin] login error', err?.code, err?.message);
    showError(err?.message || 'Sign-in failed. Check email and password.');
  } finally {
    setBusy(false);
  }
});

if (globalThis.isFirebaseConfigured?.()) {
  void redirectIfAlreadyAdmin();
} else {
  showError('Firebase is not configured.');
}

log('login page ready');
