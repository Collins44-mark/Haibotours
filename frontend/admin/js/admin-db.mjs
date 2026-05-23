import { getDb as getAdminDb, getAuth as getAdminAuth } from './firebase.js';
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, writeBatch } from '../../js/firebase-cdn.mjs';
import { formatFirestoreError } from './admin-errors.mjs';

export const ADMIN_DOC = 'main';
const WRITE_TIMEOUT_MS = 20000;

/** Firestore rejects undefined values — strip them before setDoc. */
export function sanitizeFirestoreData(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeFirestoreData(item)).filter((item) => item !== undefined);
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      const clean = sanitizeFirestoreData(val);
      if (clean !== undefined) out[key] = clean;
    }
    return out;
  }
  return value;
}

function requireSignedInAdmin() {
  const user = getAdminAuth()?.currentUser;
  if (!user) {
    throw Object.assign(new Error('Session expired. Please sign in again.'), { code: 'unauthenticated' });
  }
  return user;
}

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
  requireSignedInAdmin();
  const clean = sanitizeFirestoreData({ ...data, updatedAt: Date.now() });
  console.log('[HAIBO] Saving to Firestore', `${coll}/${id}`);
  try {
    await withFirestore((database) =>
      Promise.race([
        setDoc(doc(database, coll, id), clean, { merge: true }),
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('Save timed out. Check your connection and try again.')),
            WRITE_TIMEOUT_MS
          );
        }),
      ])
    );
    console.log('[HAIBO] Firestore update successful', `${coll}/${id}`);
  } catch (err) {
    console.error('[HAIBO] Firestore save failed', coll, id, err);
    throw err;
  }
}

export async function dbGetDoc(coll, docId) {
  return withFirestore(async (database) => {
    const snap = await getDoc(doc(database, coll, docId || ADMIN_DOC));
    return snap.exists() ? snap.data() : null;
  });
}

/** Read without toast noise — for optional CMS loads (static fallback). */
export async function dbGetDocOptional(coll, docId) {
  try {
    const database = getAdminDb();
    if (!database) return null;
    const snap = await getDoc(doc(database, coll, docId || ADMIN_DOC));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('[HAIBO Admin] read skipped', coll, docId, err?.code || err?.message);
    return null;
  }
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
  let t = document.getElementById('haibo-toast') || document.getElementById('admin-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'haibo-toast';
    t.className = 'haibo-toast';
    document.body.appendChild(t);
  }
  const kind = type || 'info';
  t.className = t.classList.contains('haibo-toast')
    ? `haibo-toast haibo-toast--${kind} is-visible`
    : `admin-toast admin-toast--${kind} is-visible`;
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
