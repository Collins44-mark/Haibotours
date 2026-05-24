/**
 * HAIBO CMS — Firestore is the only source of truth (realtime onSnapshot).
 */
import { doc, collection, onSnapshot } from './firebase-cdn.mjs';
import { getHaiboDb } from './firebase-app.mjs';

const MAIN_ID = 'main';

export function emptyCmsDocument() {
  return {
    version: 1,
    updatedAt: 0,
    destinations: [],
    hero: null,
    about: null,
    contact: null,
    socials: null,
    settings: null,
    gallery: [],
    weatherCards: [],
  };
}

function paths() {
  return globalThis.FIRESTORE_PATHS || {};
}

function bumpImageUrl(url, updatedAt) {
  if (!url || typeof url !== 'string') return url;
  if (!updatedAt) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${updatedAt}`;
}

function withCacheBustOnDoc(data, updatedAt) {
  if (!data || typeof data !== 'object') return data;
  const ts = updatedAt || data.updatedAt || Date.now();
  const out = { ...data, updatedAt: ts };
  for (const key of ['backgroundImageUrl', 'imageUrl', 'logoUrl', 'image', 'cardImage', 'heroImage', 'src', 'thumb']) {
    if (out[key]) out[key] = bumpImageUrl(out[key], ts);
  }
  return out;
}

export function aggregateCmsSnapshot(parts) {
  const cms = emptyCmsDocument();
  cms.hero = parts.hero ? withCacheBustOnDoc(parts.hero) : null;
  cms.about = parts.about ? withCacheBustOnDoc(parts.about) : null;
  cms.contact = parts.contact ? withCacheBustOnDoc(parts.contact) : null;
  cms.socials = parts.socials ? withCacheBustOnDoc(parts.socials) : null;
  cms.settings = parts.settings ? withCacheBustOnDoc(parts.settings) : null;
  cms.destinations = (parts.destinations || []).map((d) => withCacheBustOnDoc(d));
  cms.gallery = (parts.gallery || []).map((g) => withCacheBustOnDoc(g));
  cms.weatherCards = (parts.weatherCards || []).map((w) => withCacheBustOnDoc(w));
  cms.updatedAt = Math.max(
    0,
    cms.hero?.updatedAt || 0,
    cms.about?.updatedAt || 0,
    cms.contact?.updatedAt || 0,
    cms.settings?.updatedAt || 0,
    ...cms.destinations.map((d) => d.updatedAt || 0),
    ...cms.gallery.map((g) => g.updatedAt || 0),
    ...cms.weatherCards.map((w) => w.updatedAt || 0)
  );
  return cms;
}

/**
 * Live listeners — all devices receive the same Firestore data instantly.
 */
export function subscribePublicCms(onUpdate, handlers = {}) {
  const db = getHaiboDb();
  if (!db) {
    console.warn('[HAIBO] Firestore not configured — cannot load live content');
    handlers.onError?.(new Error('Firestore not configured'));
    return () => {};
  }

  const p = paths();
  const state = {
    hero: null,
    about: null,
    contact: null,
    socials: null,
    settings: null,
    destinations: [],
    gallery: [],
    weatherCards: [],
  };

  const emit = (snap, label) => {
    if (snap?.metadata?.fromCache && !snap?.metadata?.hasPendingWrites) {
      console.log(`[HAIBO] Firestore snapshot (${label}) from local cache — waiting for server`);
    } else {
      console.log(`[HAIBO] Firestore realtime update (${label})`);
    }
    onUpdate(aggregateCmsSnapshot(state));
  };

  const unsubs = [];

  const bindDoc = (coll, key) => {
    if (!coll) return;
    unsubs.push(
      onSnapshot(
        doc(db, coll, MAIN_ID),
        (snap) => {
          state[key] = snap.exists() ? snap.data() : null;
          emit(snap, `${coll}/${MAIN_ID}`);
        },
        (err) => {
          console.error(`[HAIBO] Firestore listener error ${coll}/${MAIN_ID}:`, err);
          handlers.onError?.(err);
        }
      )
    );
  };

  const bindCollection = (coll, key) => {
    if (!coll) return;
    unsubs.push(
      onSnapshot(
        collection(db, coll),
        (snap) => {
          state[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          emit(snap, coll);
        },
        (err) => {
          console.error(`[HAIBO] Firestore listener error ${coll}:`, err);
          handlers.onError?.(err);
        }
      )
    );
  };

  bindDoc(p.hero, 'hero');
  bindDoc(p.about, 'about');
  bindDoc(p.contact, 'contact');
  bindDoc(p.socials, 'socials');
  bindDoc(p.settings, 'settings');
  bindCollection(p.destinations, 'destinations');
  bindCollection(p.gallery, 'gallery');
  bindCollection(p.weatherCards, 'weatherCards');

  console.log('[HAIBO] Firestore realtime listeners attached');

  return () => {
    unsubs.forEach((u) => {
      try {
        u();
      } catch {
        /* ignore */
      }
    });
  };
}
