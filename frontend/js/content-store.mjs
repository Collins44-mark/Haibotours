/**
 * Firestore realtime listeners — live website updates
 */
import { doc, onSnapshot, collection } from `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
import { getHaiboDb } from './firebase-app.mjs';

const DOC_MAIN = 'main';
const listeners = [];

window.HAIBO_CONTENT = {
  hero: null,
  about: null,
  contact: null,
  socials: null,
  settings: null,
  destinations: [],
  gallery: { images: [], videos: [] },
  weatherCards: [],
  search: { enabledDestinationIds: [] },
};

window.HAIBO_CONTENT_LOADED = false;

function applyConfigFromContent() {
  const c = window.HAIBO_CONTENT.contact || {};
  const s = window.HAIBO_CONTENT.socials || {};
  const st = window.HAIBO_CONTENT.settings || {};

  if (st?.logoUrl) HAIBO_CONFIG.logoPath = st.logoUrl;
  if (c.phoneDisplay) HAIBO_CONFIG.phoneDisplay = c.phoneDisplay;
  if (c.email) HAIBO_CONFIG.email = c.email;
  if (c.whatsappNumber) HAIBO_CONFIG.whatsappNumber = c.whatsappNumber;
  if (c.address) HAIBO_CONFIG.address = c.address;
  if (c.officeHours) HAIBO_CONFIG.officeHours = c.officeHours;
  if (c.mapUrl) HAIBO_CONFIG.mapUrl = c.mapUrl;
  if (c.defaultTourMessage) HAIBO_CONFIG.defaultTourMessage = c.defaultTourMessage;

  HAIBO_CONFIG.social = {
    instagram: s.instagram || HAIBO_CONFIG.social?.instagram || '',
    facebook: s.facebook || HAIBO_CONFIG.social?.facebook || '',
    tiktok: s.tiktok || '',
    whatsapp: s.whatsapp || '',
  };
}

function applyDestinations() {
  const list = window.HAIBO_CONTENT.destinations;
  if (Array.isArray(list) && list.length > 0) {
    window.DESTINATIONS = list
      .filter((d) => d && d.id && d.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}

function syncSearchIds() {
  const ids = window.HAIBO_CONTENT.settings?.searchEnabledIds;
  window.HAIBO_CONTENT.search.enabledDestinationIds =
    ids?.length > 0 ? ids : window.HAIBO_CONTENT.destinations.map((d) => d.id);
}

function buildDefaultContent() {
  window.HAIBO_CONTENT.destinations =
    typeof DESTINATIONS !== 'undefined' ? [...DESTINATIONS] : [];
  window.HAIBO_CONTENT.gallery.images =
    typeof GALLERY_IMAGES !== 'undefined' ? [...GALLERY_IMAGES] : [];
  window.HAIBO_CONTENT.gallery.videos =
    typeof GALLERY_VIDEOS !== 'undefined' ? [...GALLERY_VIDEOS] : [];
  window.HAIBO_CONTENT.weatherCards =
    typeof WEATHER_PARKS_STATIC !== 'undefined'
      ? WEATHER_PARKS_STATIC.map((p) => ({ ...p, active: true }))
      : typeof WEATHER_PARKS !== 'undefined'
        ? WEATHER_PARKS.map((p) => ({ ...p, active: true }))
        : [];
  syncSearchIds();
  applyDestinations();
  applyConfigFromContent();
}

let initialPending = 0;
let initialComplete = false;

function publish(isInitial) {
  syncSearchIds();
  applyDestinations();
  applyConfigFromContent();

  if (isInitial && !initialComplete) {
    initialComplete = true;
    window.HAIBO_CONTENT_LOADED = true;
    window.dispatchEvent(new Event('haiboContentReady'));
  } else if (initialComplete) {
    window.dispatchEvent(new Event('haiboContentUpdated'));
  }
}

function tickInitial() {
  initialPending -= 1;
  if (initialPending <= 0) publish(true);
}

function subscribeDoc(db, coll, key) {
  initialPending += 1;
  const unsub = onSnapshot(
    doc(db, coll, DOC_MAIN),
    (snap) => {
      window.HAIBO_CONTENT[key] = snap.exists() ? snap.data() : null;
      if (!initialComplete) tickInitial();
      else publish(false);
    },
    (err) => {
      console.warn(`HAIBO listener error (${coll}):`, err);
      if (!initialComplete) tickInitial();
    }
  );
  listeners.push(unsub);
}

function subscribeCollection(db, coll, handler) {
  initialPending += 1;
  const unsub = onSnapshot(
    collection(db, coll),
    (snap) => {
      handler(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (!initialComplete) tickInitial();
      else publish(false);
    },
    (err) => {
      console.warn(`HAIBO listener error (${coll}):`, err);
      if (!initialComplete) tickInitial();
    }
  );
  listeners.push(unsub);
}

function startRealtimeListeners() {
  const db = getHaiboDb();
  if (!db) {
    buildDefaultContent();
    publish(true);
    return;
  }

  subscribeDoc(db, FIRESTORE_PATHS.hero, 'hero');
  subscribeDoc(db, FIRESTORE_PATHS.about, 'about');
  subscribeDoc(db, FIRESTORE_PATHS.contact, 'contact');
  subscribeDoc(db, FIRESTORE_PATHS.socials, 'socials');
  subscribeDoc(db, FIRESTORE_PATHS.settings, 'settings');

  subscribeCollection(db, FIRESTORE_PATHS.destinations, (items) => {
    if (items.length) window.HAIBO_CONTENT.destinations = items;
    else if (!initialComplete && typeof DESTINATIONS !== 'undefined') {
      window.HAIBO_CONTENT.destinations = [...DESTINATIONS];
    }
  });

  subscribeCollection(db, FIRESTORE_PATHS.gallery, (items) => {
    const images = items
      .filter((g) => g.type === 'image' || !g.type)
      .filter((g) => g.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const videos = items
      .filter((g) => g.type === 'video')
      .filter((g) => g.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (images.length || videos.length) {
      window.HAIBO_CONTENT.gallery = { images, videos };
    } else if (!initialComplete) {
      window.HAIBO_CONTENT.gallery.images =
        typeof GALLERY_IMAGES !== 'undefined' ? [...GALLERY_IMAGES] : [];
      window.HAIBO_CONTENT.gallery.videos =
        typeof GALLERY_VIDEOS !== 'undefined' ? [...GALLERY_VIDEOS] : [];
    }
  });

  subscribeCollection(db, FIRESTORE_PATHS.weatherCards, (items) => {
    const active = items.filter((w) => w.active !== false);
    if (active.length) window.HAIBO_CONTENT.weatherCards = active;
    else if (!initialComplete && typeof WEATHER_PARKS_STATIC !== 'undefined') {
      window.HAIBO_CONTENT.weatherCards = WEATHER_PARKS_STATIC.map((p) => ({
        ...p,
        active: true,
      }));
    }
  });
}

export function initHaiboContentRealtime() {
  if (!isFirebaseConfigured()) {
    buildDefaultContent();
    publish(true);
    return;
  }
  try {
    startRealtimeListeners();
  } catch (err) {
    console.warn('HAIBO: Firebase realtime failed, using defaults.', err);
    buildDefaultContent();
    publish(true);
  }
}

window.initHaiboContent = initHaiboContentRealtime;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHaiboContentRealtime);
} else {
  initHaiboContentRealtime();
}
