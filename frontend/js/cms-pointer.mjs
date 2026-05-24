/**
 * Global CMS pointer — one Firestore doc so every device loads the same Cloudinary JSON.
 */
import { doc, getDoc, setDoc, onSnapshot } from './firebase-cdn.mjs';
import { getHaiboDb } from './firebase-app.mjs';

const CMS_POINTER_PATH = 'cmsMeta/live';

function pointerRef() {
  const db = getHaiboDb();
  if (!db) return null;
  return doc(db, CMS_POINTER_PATH);
}

/** After admin save — tell all visitors which Cloudinary URL is current. */
export async function publishCmsPointer({ deliveryUrl, updatedAt }) {
  if (!deliveryUrl) return;
  const ref = pointerRef();
  if (!ref) return;
  try {
    await setDoc(
      ref,
      {
        deliveryUrl,
        updatedAt: updatedAt || Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[HAIBO] cms pointer write failed (deploy firestore.rules cmsMeta):', err?.code || err?.message);
  }
}

/** Read pointer (public — no login required). */
export async function fetchCmsPointer() {
  const ref = pointerRef();
  if (!ref) return null;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data?.deliveryUrl) return null;
    return data;
  } catch (err) {
    console.warn('[HAIBO] cms pointer read failed:', err?.code || err?.message);
    return null;
  }
}

/** Live updates on phone/laptop when admin saves elsewhere. */
export function watchCmsPointer(onUpdate) {
  const ref = pointerRef();
  if (!ref || typeof onUpdate !== 'function') return () => {};

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data?.deliveryUrl) onUpdate(data);
    },
    (err) => {
      console.warn('[HAIBO] cms pointer listener:', err?.code || err?.message);
    }
  );
}
