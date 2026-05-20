/**
 * User-safe Firebase error messages (no internal codes in UI).
 */

const AUTH_MESSAGES = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/invalid-api-key': 'Authentication is misconfigured. Contact the site owner.',
  'auth/operation-not-allowed': 'Email sign-in is not enabled in Firebase.',
};

const FIRESTORE_MESSAGES = {
  'permission-denied': 'You do not have permission to change this content. Sign in as an admin.',
  'unauthenticated': 'Your session expired. Please sign in again.',
  'not-found': 'The requested document was not found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please wait and try again.',
  'unavailable': 'Service temporarily unavailable. Try again shortly.',
  'deadline-exceeded': 'Request timed out. Try again.',
  'cancelled': 'Operation was cancelled.',
};

export function formatAuthError(error) {
  if (!error) return 'Something went wrong. Please try again.';
  if (error?.friendlyMessage) return error.friendlyMessage;
  if (String(error?.message || '').includes('timed out')) {
    return 'Connection timed out. Check your network and try again.';
  }
  const code = error?.code || '';
  if (code === 'auth/not-authorized') {
    return 'This account is not authorized for admin access.';
  }
  if (AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];
  if (typeof console !== 'undefined') {
    console.warn('[HAIBO Admin] Auth error:', code, error?.message);
  }
  return 'Sign-in failed. Check your email and password.';
}

export function formatFirestoreError(error) {
  const code = error?.code?.replace('firestore/', '') || error?.code || '';
  if (FIRESTORE_MESSAGES[code]) return FIRESTORE_MESSAGES[code];
  if (code === 'permission-denied' || error?.message?.includes('permission')) {
    return FIRESTORE_MESSAGES['permission-denied'];
  }
  if (typeof console !== 'undefined') {
    console.warn('[HAIBO Admin] Firestore error:', code, error?.message);
  }
  return 'Could not save changes. Try again or sign in again.';
}

export function formatAdminError(error, context) {
  if (!error) return 'Something went wrong. Please try again.';
  const code = error?.code || '';
  if (code.startsWith('auth/')) return formatAuthError(error);
  if (code.startsWith('firestore/') || FIRESTORE_MESSAGES[code.replace('firestore/', '')]) {
    return formatFirestoreError(error);
  }
  if (context) return `${context} failed. Please try again.`;
  return 'Something went wrong. Please try again.';
}
