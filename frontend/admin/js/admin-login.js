/**
 * HAIBO Admin login — sign in, verify admin, go to dashboard.
 */
import {
  getAuth,
  signInAdmin,
  signOutAdmin,
  isAdminUser,
  isAdminEmail,
  onAuthStateChanged,
  DASHBOARD_URL,
  log,
} from './firebase.js';

const UNAUTHORIZED_MSG =
  'Unauthorized. Add your email to HAIBO_ADMIN_EMAIL_ALLOWLIST in firebase-config.js.';

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

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  e.stopPropagation();
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

    if (!(await isAdminUser(user))) {
      await signOutAdmin();
      showError(UNAUTHORIZED_MSG);
      log('denied — not admin', user.uid);
      return;
    }

    log('redirect → dashboard');
    window.location.replace(DASHBOARD_URL);
  } catch (err) {
    console.error('[HAIBO Admin] login error', err?.code, err?.message);
    showError(err?.message || 'Sign-in failed. Check email and password.');
  } finally {
    setBusy(false);
  }
});

const auth = getAuth();
if (!globalThis.isFirebaseConfigured?.()) {
  showError('Firebase is not configured.');
} else if (auth) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    if (await isAdminUser(user)) {
      window.location.replace(DASHBOARD_URL);
    }
  });
}

log('login page ready');
