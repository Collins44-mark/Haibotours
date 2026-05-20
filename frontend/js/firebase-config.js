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

const FIREBASE_SDK_VERSION = '10.14.1';

function isFirebaseConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

/**
 * Production: add your Vercel/custom domain in Firebase Console →
 * Authentication → Settings → Authorized domains
 * (e.g. haibotours.vercel.app, www.haibotours.com)
 */
