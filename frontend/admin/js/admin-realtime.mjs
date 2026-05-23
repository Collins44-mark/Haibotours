/**
 * Admin Firestore realtime — refresh CMS state when data changes.
 */
import { collection, onSnapshot } from '../../js/firebase-cdn.mjs';
import { getDb } from './firebase.js';

const unsubs = [];

export function subscribeAdminCollections(handlers) {
  const db = getDb();
  if (!db || !globalThis.FIRESTORE_PATHS) return () => {};

  const paths = globalThis.FIRESTORE_PATHS;

  const bind = (coll, cb) => {
    const unsub = onSnapshot(
      collection(db, coll),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        cb(items);
      },
      (err) => console.warn('[HAIBO Admin] realtime', coll, err)
    );
    unsubs.push(unsub);
  };

  bind(paths.destinations, handlers.onDestinations);
  bind(paths.gallery, handlers.onGallery);
  bind(paths.weatherCards, handlers.onWeather);

  return () => {
    unsubs.forEach((u) => {
      try {
        u();
      } catch {
        /* ignore */
      }
    });
    unsubs.length = 0;
  };
}
