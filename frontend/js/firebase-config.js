/**
 * HAIBO — Firebase & Cloudinary (public web config)
 */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD3e2_hvED03guKtaK_UuhbREF_P871RHc',
  authDomain: 'haibo-tours.firebaseapp.com',
  projectId: 'haibo-tours',
  storageBucket: 'haibo-tours.firebasestorage.app',
  messagingSenderId: '473915160488',
  appId: '1:473915160488:web:36993b3f18e046b5478f9d',
};

const CLOUDINARY_CONFIG = {
  cloudName: 'dae3rpnmg',
  uploadPreset: 'ml_default',
  baseFolder: 'haibo',
};

const FIRESTORE_PATHS = {
  hero: 'hero',
  about: 'about',
  contact: 'contact',
  socials: 'socials',
  settings: 'settings',
  destinations: 'destinations',
  gallery: 'gallery',
  weatherCards: 'weatherCards',
};

/** Firestore allowlist: document ID = Firebase Auth UID */
const FIRESTORE_ADMIN_COLLECTION = 'admins';

/**
 * Optional emergency admin emails (lowercase not required).
 * Prefer Firestore admins/{uid}. Example: ['you@example.com']
 */
/** Leave empty to allow any Firebase Auth user. Or restrict: ['you@haibotours.com'] */
const HAIBO_ADMIN_EMAIL_ALLOWLIST = [];

/** If true, skip Firestore admins/{uid} check (not recommended for production). */
const HAIBO_TRUST_AUTHENTICATED_USERS = false;

const FIREBASE_SDK_VERSION = '10.14.1';

function isFirebaseConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

/** Expose for ES modules (modules cannot read const from this script file). */
globalThis.FIREBASE_CONFIG = FIREBASE_CONFIG;
globalThis.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;
globalThis.FIRESTORE_PATHS = FIRESTORE_PATHS;
globalThis.FIRESTORE_ADMIN_COLLECTION = FIRESTORE_ADMIN_COLLECTION;
globalThis.HAIBO_ADMIN_EMAIL_ALLOWLIST = HAIBO_ADMIN_EMAIL_ALLOWLIST;
globalThis.HAIBO_TRUST_AUTHENTICATED_USERS = HAIBO_TRUST_AUTHENTICATED_USERS;
globalThis.FIREBASE_SDK_VERSION = FIREBASE_SDK_VERSION;
globalThis.isFirebaseConfigured = isFirebaseConfigured;

/**
 * Production: add your Vercel/custom domain in Firebase Console →
 * Authentication → Settings → Authorized domains
 * (e.g. haibotours.vercel.app, www.haibotours.com)
 */
