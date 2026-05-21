import { FIREBASE_SDK_VERSION } from '../../js/firebase-sdk-version.mjs';
import { doc, getDoc, setDoc } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import {
  ensureAuthReady,
  adminLogout,
  getAdminAuth,
  getAdminDb,
  adminLogin,
  waitForSignedInUser,
} from './admin-firebase.mjs';
import { formatAuthError } from './admin-errors.mjs';

/** Canonical routes (Vercel rewrites) */
export const ADMIN_LOGIN_PATH = '/admin-login';
export const ADMIN_DASHBOARD_PATH = '/admin';
/** Alias — same SPA as /admin (Vercel rewrite) */
export const ADMIN_DASHBOARD_ALIAS_PATH = '/admin-dashboard';

const AUTH_READY_TIMEOUT_MS = 15000;
const ADMIN_CHECK_TIMEOUT_MS = 10000;
const SIGN_IN_TIMEOUT_MS = 30000;
const REDIRECT_GUARD_KEY = 'haibo_admin_redirect_guard';
const JUST_LOGGED_IN_KEY = 'haibo_admin_just_logged_in';
const AUTH_FAIL_KEY = 'haibo_admin_last_fail';

/** Firestore allowlist collection (from firebase-config.js or fallback) */
const ADMIN_COLLECTION = globalThis.FIRESTORE_ADMIN_COLLECTION || 'admins';

function isLocalDev() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || window.location.protocol === 'file:';
}

export function resolveLoginPath() {
  return isLocalDev() ? '/admin/login.html' : ADMIN_LOGIN_PATH;
}

export function resolveDashboardPath() {
  if (isLocalDev()) return '/admin/index.html';
  /* Production canonical dashboard URL (Vercel rewrite → admin/index.html) */
  return ADMIN_DASHBOARD_ALIAS_PATH;
}

export function isLoginPage() {
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return (
    p === '/admin-login' ||
    p === '/admin/login' ||
    /\/admin\/login\.html$/i.test(p) ||
    /\/admin-login\.html$/i.test(p)
  );
}

export function isDashboardPage() {
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return (
    p === '/admin' ||
    p === '/admin-dashboard' ||
    /\/admin\/index\.html$/i.test(p)
  );
}

export function showAuthLoading(message) {
  if (isLoginPage()) return;
  const el = document.getElementById('admin-auth-loading');
  if (el) {
    el.hidden = false;
    el.style.display = '';
    el.setAttribute('aria-busy', 'true');
    const msg = el.querySelector('[data-auth-loading-msg]');
    if (msg) msg.textContent = message || 'Checking session…';
  }
  document.body.classList.add('admin-auth-pending');
  document.body.classList.remove('admin-authenticated', 'admin-login-ready');
}

export function hideAuthLoading() {
  const el = document.getElementById('admin-auth-loading');
  if (el) {
    el.hidden = true;
    el.setAttribute('aria-busy', 'false');
  }
  document.body.classList.remove('admin-auth-pending');
  if (isLoginPage()) {
    document.body.classList.add('admin-login-ready');
  }
}

export function markAuthenticated() {
  document.body.classList.add('admin-authenticated');
  document.body.classList.remove('admin-auth-pending', 'admin-login-ready');
  try {
    sessionStorage.removeItem(REDIRECT_GUARD_KEY);
  } catch {
    /* ignore */
  }
}

export function showAuthBanner(message, type) {
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = message;
  el.style.color = type === 'warn' ? '#fbbf24' : '#f87171';
}

function saveAuthFailure(reason, uid, detail) {
  try {
    sessionStorage.setItem(
      AUTH_FAIL_KEY,
      JSON.stringify({ reason, uid, detail, at: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

function loadAuthFailure() {
  try {
    const raw = sessionStorage.getItem(AUTH_FAIL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearAuthFailure() {
  try {
    sessionStorage.removeItem(AUTH_FAIL_KEY);
  } catch {
    /* ignore */
  }
}

function showStoredAuthFailure() {
  const fail = loadAuthFailure();
  if (!fail) return;
  const uid = fail.uid ? ` Your UID: ${fail.uid}` : '';
  if (fail.reason === 'not-in-admins') {
    showUnauthorizedMessage(fail.uid, 'not-in-admins');
  } else if (fail.reason === 'permission-denied') {
    showUnauthorizedMessage(fail.uid, 'permission-denied');
  } else if (fail.reason === 'session') {
    showAuthBanner(
      `Could not verify session on the dashboard.${uid} Sign in again. If this repeats, add admins/${fail.uid || 'YOUR_UID'} in Firestore (not only Authentication).`,
      'warn'
    );
  } else if (fail.detail) {
    showAuthBanner(fail.detail + uid, 'error');
  }
}

/** Full-screen message on dashboard — avoids login ↔ admin redirect loops */
function showDashboardAccessDenied(user, adminResult) {
  hideAuthLoading();
  document.body.classList.remove('admin-auth-pending');
  const uid = user?.uid || adminResult?.uid || '';
  const email = user?.email || '';
  let help = '';

  if (adminResult?.reason === 'permission-denied') {
    help =
      '<p>Firestore rules blocked reading <code>admins/' +
      uid +
      '</code>. Deploy <code>firebase/firestore.rules</code> to project <strong>haibo-tours</strong>.</p>';
  } else if (adminResult?.reason === 'not-in-admins') {
    help =
      '<p><strong>Authentication ≠ Admin access.</strong> Adding a user under Firebase <em>Authentication</em> is not enough.</p>' +
      '<ol style="text-align:left;margin:1rem auto;max-width:26rem;color:#ccc;line-height:1.6">' +
      '<li>Firebase Console → <strong>Firestore Database</strong> (not Authentication)</li>' +
      '<li>Collection: <code>admins</code></li>' +
      '<li>Document ID: <code style="color:#ffb347">' +
      uid +
      '</code> (copy exactly from Authentication → Users → UID)</li>' +
      '<li>Fields: optional (empty document is OK)</li>' +
      '</ol>';
  } else {
    help = '<p>Could not verify admin access. Check network and Firestore rules.</p>';
  }

  document.querySelector('.admin-shell')?.remove();
  document.body.innerHTML =
    '<div style="padding:2.5rem 1.5rem;color:#fff;font-family:Poppins,sans-serif;max-width:32rem;margin:0 auto">' +
    '<h1 style="color:#d98b2b;font-size:1.5rem">Admin access required</h1>' +
    '<p style="color:#9ca3af;margin:0.5rem 0 1rem">Signed in as ' +
    (email || 'unknown') +
    '</p>' +
    help +
    '<p style="margin-top:1.5rem"><a href="' +
    resolveLoginPath() +
    '" style="color:#d98b2b">← Back to login</a></p>' +
    '<button type="button" id="haibo-retry-admin-check" style="margin-top:1rem;padding:0.75rem 1.25rem;border-radius:999px;border:none;background:#d98b2b;color:#000;font-weight:600;cursor:pointer">Retry verification</button>' +
    '</div>';

  document.getElementById('haibo-retry-admin-check')?.addEventListener('click', () => {
    window.location.reload();
  });
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

function normalizePath(path) {
  return (path || '/').replace(/\/$/, '') || '/';
}

/**
 * Prevent rapid redirect loops between /admin-login and /admin.
 */
export function safeRedirect(url) {
  const target = new URL(url, window.location.origin);
  const targetPath = normalizePath(target.pathname);
  const currentPath = normalizePath(window.location.pathname);

  if (targetPath === currentPath) {
    return false;
  }

  try {
    const raw = sessionStorage.getItem(REDIRECT_GUARD_KEY);
    const now = Date.now();
    if (raw) {
      const [ts, lastPath] = raw.split('|');
      if (now - Number(ts) < 2500 && lastPath === targetPath) {
        console.warn('[HAIBO Admin] Redirect loop prevented →', targetPath);
        return false;
      }
    }
    sessionStorage.setItem(REDIRECT_GUARD_KEY, `${now}|${targetPath}`);
  } catch {
    /* ignore */
  }

  window.location.replace(target.href);
  return true;
}

export function redirectToLogin(query) {
  const dest = resolveLoginPath() + (query ? `?${query}` : '');
  if (!isLoginPage()) safeRedirect(dest);
}

export function redirectToDashboard() {
  if (!isDashboardPage()) safeRedirect(resolveDashboardPath());
}

function isEmailAdminAllowlisted(email) {
  const list = globalThis.HAIBO_ADMIN_EMAIL_ALLOWLIST || [];
  if (!Array.isArray(list) || !email) return false;
  const normalized = String(email).trim().toLowerCase();
  return list.some((e) => String(e).trim().toLowerCase() === normalized);
}

/** Create admins/{uid} on first sign-in so CMS access works without manual Console setup */
export async function ensureAdminRecord(user) {
  if (!user?.uid) return { ok: false, reason: 'no-user' };
  const db = getAdminDb();
  if (!db) return { ok: false, reason: 'no-db' };
  const ref = doc(db, ADMIN_COLLECTION, user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return { ok: true, reason: 'exists' };
    await setDoc(
      ref,
      {
        email: user.email || '',
        admin: 'admin',
        role: 'admin',
        createdAt: Date.now(),
      },
      { merge: true }
    );
    return { ok: true, reason: 'created' };
  } catch (err) {
    console.error('[HAIBO Admin] ensureAdminRecord:', err?.code, err?.message);
    return { ok: false, reason: 'provision-failed', uid: user.uid, error: err };
  }
}

function adminDocHasPrivilege(data) {
  if (!data || typeof data !== 'object') return false;
  return data.admin === 'admin' || data.admin === true || data.role === 'admin';
}

export async function checkIsAdminUser(user) {
  if (!user) return { ok: false, reason: 'no-user' };
  if (globalThis.HAIBO_TRUST_AUTHENTICATED_USERS === true) {
    return { ok: true, reason: 'trusted-auth' };
  }
  if (isEmailAdminAllowlisted(user.email)) {
    return { ok: true, reason: 'email-allowlist' };
  }
  const db = getAdminDb();
  if (!db) {
    console.warn('[HAIBO Admin] Firestore unavailable for admin check');
    return { ok: false, reason: 'no-db' };
  }
  try {
    const ref = doc(db, ADMIN_COLLECTION, user.uid);
    const snap = await withTimeout(getDoc(ref), ADMIN_CHECK_TIMEOUT_MS, 'Admin verification');
    if (!snap.exists()) {
      return { ok: false, reason: 'not-in-admins', uid: user.uid };
    }
    const data = snap.data();
    if (!adminDocHasPrivilege(data)) {
      return { ok: false, reason: 'missing-admin-field', uid: user.uid };
    }
    return { ok: true };
  } catch (err) {
    console.error('[HAIBO Admin] Admin check failed:', err?.code, err?.message, err);
    const code = err?.code || '';
    if (code === 'permission-denied' || String(err?.message || '').includes('permission')) {
      return { ok: false, reason: 'permission-denied', uid: user.uid };
    }
    return { ok: false, reason: 'check-failed', uid: user.uid };
  }
}

/**
 * Wait until Firebase has restored persisted auth (not the first null tick).
 */
export async function waitForAuthState(timeoutMs = AUTH_READY_TIMEOUT_MS) {
  const auth = await ensureAuthReady(timeoutMs);
  if (!auth) {
    return { user: null, ready: true, error: 'Auth unavailable' };
  }

  const user = await withTimeout(
    waitForSignedInUser(auth, timeoutMs),
    timeoutMs,
    'Auth state'
  );
  return { user: user ?? auth.currentUser ?? null, ready: true };
}

function justLoggedInRecently() {
  try {
    const raw = sessionStorage.getItem(JUST_LOGGED_IN_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < 30000;
  } catch {
    return false;
  }
}

export function markJustLoggedIn() {
  try {
    sessionStorage.setItem(JUST_LOGGED_IN_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export async function resolveAdminSession() {
  const retries = justLoggedInRecently() ? 8 : 3;
  const retryDelayMs = 600;
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await ensureAuthReady(AUTH_READY_TIMEOUT_MS);
      const state = await waitForAuthState(AUTH_READY_TIMEOUT_MS);
      const user = state.user ?? null;

      if (!user) {
        lastError = state.error || 'No signed-in user';
        if (attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, retryDelayMs));
          continue;
        }
        return { user: null, isAdmin: false, error: lastError };
      }

      const adminResult = await checkIsAdminUser(user);
      if (adminResult.ok) {
        try {
          sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
        } catch {
          /* ignore */
        }
        return { user, isAdmin: true };
      }

      return {
        user,
        isAdmin: false,
        adminReason: adminResult.reason,
        uid: adminResult.uid || user.uid,
      };
    } catch (err) {
      lastError = err.message;
      console.error('[HAIBO Admin] resolveAdminSession attempt', attempt + 1, err);
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
    }
  }

  const auth = getAdminAuth();
  return {
    user: auth?.currentUser ?? null,
    isAdmin: false,
    error: lastError,
    timedOut: String(lastError || '').includes('timed out'),
  };
}

export function showUnauthorizedMessage(uid, reason) {
  if (reason === 'permission-denied') {
    showAuthBanner(
      'Firestore blocked the admin check. Deploy firebase/firestore.rules and ensure you are signed in.',
      'error'
    );
    return;
  }
  const idHint = uid
    ? ` Firestore Database → collection "admins" → document ID (exactly): ${uid}`
    : ' Add admins/YOUR_UID in Firestore Database (not Authentication).';
  showAuthBanner(`This account is not authorized.${idHint}`, 'error');
}

export async function guardAdminDashboard(onReady) {
  if (!globalThis.isFirebaseConfigured?.()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1><p>Edit frontend/js/firebase-config.js</p></div>';
    return;
  }

  if (isLoginPage()) {
    redirectToDashboard();
    return;
  }

  showAuthLoading('Verifying admin session…');

  const revealDashboard = (user) => {
    markAuthenticated();
    hideAuthLoading();
    if (typeof onReady === 'function') onReady(user);
  };

  const safetyTimer = setTimeout(async () => {
    console.warn('[HAIBO Admin] Dashboard load safety timeout');
    const auth = getAdminAuth();
    const user = auth?.currentUser;
    if (user) {
      const adminResult = await checkIsAdminUser(user);
      if (adminResult.ok) {
        revealDashboard(user);
        return;
      }
    }
    hideAuthLoading();
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center;max-width:28rem;margin:0 auto">' +
      '<h2 style="color:#d98b2b">Session check timed out</h2>' +
      '<p style="margin:1rem 0;color:#aaa">Could not verify your login. Check the network, Firestore rules, and your admins document.</p>' +
      `<p><a href="${resolveLoginPath()}" style="color:#d98b2b">Back to login</a></p></div>`;
  }, 15000);

  try {
    // No outer timeout — resolveAdminSession can take 20–40s after fresh login
    const session = await resolveAdminSession();

    if (!session.user) {
      saveAuthFailure('session', null, session.error || 'No signed-in user after login');
      hideAuthLoading();
      if (!safeRedirect(resolveLoginPath() + '?error=session')) {
        document.body.innerHTML =
          '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><p>Session required.</p><p class="admin-muted" style="color:#888">Enable cookies / site data for this domain.</p><p><a href="' +
          resolveLoginPath() +
          '" style="color:#d98b2b">Go to login</a></p></div>';
      }
      return;
    }

    if (!session.isAdmin) {
      console.warn(
        '[HAIBO Admin] Not authorized:',
        session.user.uid,
        session.adminReason || session.error
      );
      saveAuthFailure(
        session.adminReason || 'not-in-admins',
        session.user.uid,
        'Missing or invalid admins document'
      );
      try {
        sessionStorage.setItem('haibo_admin_last_uid', session.user.uid);
      } catch {
        /* ignore */
      }
      // Stay on dashboard URL — show fix instructions (do NOT logout/redirect loop)
      showDashboardAccessDenied(session.user, {
        ok: false,
        reason: session.adminReason,
        uid: session.uid,
      });
      return;
    }

    clearAuthFailure();
    revealDashboard(session.user);
  } catch (err) {
    console.error('[HAIBO Admin] Dashboard guard failed:', err);
    hideAuthLoading();
    const auth = getAdminAuth();
    if (auth?.currentUser) {
      const adminResult = await checkIsAdminUser(auth.currentUser);
      if (adminResult.ok) {
        clearAuthFailure();
        revealDashboard(auth.currentUser);
        return;
      }
      saveAuthFailure(adminResult.reason, auth.currentUser.uid, err.message);
      showDashboardAccessDenied(auth.currentUser, adminResult);
      return;
    }
    saveAuthFailure('session', null, err.message);
    safeRedirect(resolveLoginPath() + '?error=session');
  } finally {
    clearTimeout(safetyTimer);
  }
}

export async function guardAdminLogin(onFormReady) {
  if (!globalThis.isFirebaseConfigured?.()) {
    document.body.innerHTML =
      '<div style="padding:3rem;color:#fff;font-family:Poppins,sans-serif;text-align:center"><h1 style="color:#d98b2b">Firebase not configured</h1><p>Add keys in frontend/js/firebase-config.js</p></div>';
    return;
  }

  if (isDashboardPage()) {
    await guardAdminDashboard(onFormReady);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  let hintUid = null;
  try {
    hintUid = sessionStorage.getItem('haibo_admin_last_uid');
  } catch {
    /* ignore */
  }
  showStoredAuthFailure();

  if (params.get('error') === 'unauthorized') showUnauthorizedMessage(hintUid, 'not-in-admins');
  else if (params.get('error') === 'firestore') {
    showUnauthorizedMessage(hintUid, 'permission-denied');
  } else if (params.get('error') === 'session') {
    showAuthBanner(
      'Dashboard could not restore your session. Sign in again. Ensure Firestore has admins/YOUR_UID (see Authentication → Users for UID).',
      'warn'
    );
  }

  // Always show the login form immediately — never block on "Checking session…"
  hideAuthLoading();
  if (typeof onFormReady === 'function') onFormReady();

  // Do not auto-redirect to dashboard when returning from a failed attempt (stops loops)
  const skipAutoRedirect =
    params.get('error') || params.get('noredirect') || loadAuthFailure();

  try {
    const session = await resolveAdminSession();

    if (session.user && session.isAdmin && !skipAutoRedirect) {
      clearAuthFailure();
      window.location.replace(resolveDashboardPath());
      return;
    }

    if (session.user && !session.isAdmin) {
      console.warn('[HAIBO Admin] User signed in but not admin:', session.user.uid);
      saveAuthFailure(session.adminReason, session.uid || session.user.uid);
      await adminLogout();
      showUnauthorizedMessage(session.uid || session.user.uid, session.adminReason);
    }
  } catch (err) {
    console.error('[HAIBO Admin] Background session check:', err);
  }
}

export async function handleAdminLogin(email, password) {
  clearAuthFailure();
  const cred = await withTimeout(adminLogin(email, password), SIGN_IN_TIMEOUT_MS, 'Sign in');
  const adminResult = await checkIsAdminUser(cred.user);
  if (!adminResult.ok) {
    saveAuthFailure(adminResult.reason, cred.user.uid);
    await adminLogout();
    const msg =
      adminResult.reason === 'permission-denied'
        ? 'Firestore blocked admin verification. Deploy firebase/firestore.rules to project haibo-tours.'
        : `Not authorized. In Firestore Database (not Authentication) create: admins/${cred.user.uid} — document ID must match your Auth UID exactly.`;
    throw Object.assign(new Error('NOT_ADMIN'), {
      code: 'auth/not-authorized',
      friendlyMessage: msg,
    });
  }
  markJustLoggedIn();
  clearAuthFailure();
  try {
    sessionStorage.removeItem(REDIRECT_GUARD_KEY);
    sessionStorage.setItem('haibo_admin_last_uid', cred.user.uid);
  } catch {
    /* ignore */
  }
  return cred;
}

export async function handleAdminLogout() {
  try {
    const { signOutAdmin } = await import('./admin-shell.mjs');
    await signOutAdmin();
  } catch {
    await adminLogout();
    if (isLoginPage()) return;
    const dest = resolveLoginPath();
    if (!isDashboardPage()) safeRedirect(dest);
    else window.location.replace(dest);
  }
}

export { formatAuthError };
