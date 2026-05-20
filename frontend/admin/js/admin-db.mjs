import { getAdminDb } from './admin-firebase.mjs';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  writeBatch,
} from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import { formatFirestoreError } from './admin-errors.mjs';

export const ADMIN_DOC = 'main';

export function requireDb() {
  const database = getAdminDb();
  if (!database) {
    throw Object.assign(new Error('Firestore unavailable'), { code: 'firestore/unavailable' });
  }
  return database;
}

async function withFirestore(action) {
  try {
    return await action(requireDb());
  } catch (err) {
    const friendly = formatFirestoreError(err);
    adminToast(friendly, 'error');
    throw Object.assign(new Error(friendly), { code: err?.code, cause: err });
  }
}

export async function dbSetDoc(coll, data, docId) {
  const id = docId || ADMIN_DOC;
  return withFirestore((database) =>
    setDoc(doc(database, coll, id), { ...data, updatedAt: Date.now() }, { merge: true })
  );
}

export async function dbGetDoc(coll, docId) {
  return withFirestore(async (database) => {
    const snap = await getDoc(doc(database, coll, docId || ADMIN_DOC));
    return snap.exists() ? snap.data() : null;
  });
}

export async function dbList(coll) {
  return withFirestore(async (database) => {
    const snap = await getDocs(collection(database, coll));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

export async function dbDeleteDoc(coll, docId) {
  return withFirestore((database) => deleteDoc(doc(database, coll, docId)));
}

export function getDbBatch() {
  return writeBatch(requireDb());
}

export function adminToast(message, type) {
  let t = document.getElementById('admin-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'admin-toast';
    t.className = 'admin-toast';
    document.body.appendChild(t);
  }
  t.className = `admin-toast admin-toast--${type || 'info'} is-visible`;
  t.textContent = message;
  clearTimeout(adminToast._t);
  adminToast._t = setTimeout(() => t.classList.remove('is-visible'), 3200);
}

export function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
