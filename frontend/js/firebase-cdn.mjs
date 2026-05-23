/**
 * Firebase CDN — use string-literal import URLs only (template literals break in some browsers).
 * Keep version in sync with firebase-sdk-version.mjs
 */
export { FIREBASE_SDK_VERSION } from './firebase-sdk-version.mjs';

export { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';

export {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  initializeAuth,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
