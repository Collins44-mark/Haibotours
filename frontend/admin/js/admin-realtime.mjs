/**
 * Admin Firestore realtime — reload CMS when Firestore changes (any device).
 */
import { doc, collection, onSnapshot } from '../../js/firebase-cdn.mjs';
import { getDb } from './firebase.js';

const unsubs = [];

export function subscribeAdminFirestore(onChange) {
  const db = getDb();
  const paths = globalThis.FIRESTORE_PATHS;
  if (!db || !paths || typeof onChange !== 'function') return () => {};

  const notify = () => {
    console.log('[HAIBO Admin] Firestore realtime — refreshing CMS');
    onChange();
  };

  const bindDoc = (coll) => {
    unsubs.push(onSnapshot(doc(db, coll, 'main'), notify, (err) => console.warn('[HAIBO Admin]', coll, err)));
  };

  const bindColl = (coll) => {
    unsubs.push(onSnapshot(collection(db, coll), notify, (err) => console.warn('[HAIBO Admin]', coll, err)));
  };

  bindDoc(paths.hero);
  bindDoc(paths.about);
  bindDoc(paths.contact);
  bindDoc(paths.socials);
  bindDoc(paths.settings);
  bindColl(paths.destinations);
  bindColl(paths.gallery);
  bindColl(paths.weatherCards);

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

/** @deprecated use subscribeAdminFirestore */
export function subscribeAdminCollections(handlers) {
  return subscribeAdminFirestore(async () => {
    const { loadAdminCms } = await import('./admin-cms.mjs');
    await loadAdminCms();
    const cms = window.HAIBO_ADMIN_CMS;
    handlers.onDestinations?.(cms.destinations || []);
    handlers.onGallery?.(cms.gallery || []);
    handlers.onWeather?.(cms.weatherCards || []);
  });
}
