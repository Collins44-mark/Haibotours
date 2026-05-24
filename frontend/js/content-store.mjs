/**
 * Live website content — Firestore realtime only (onSnapshot). No localStorage CMS cache.
 */
import { subscribePublicCms } from './cms-firestore.mjs';
import { haiboDestinationsFromFirestoreDocs } from './haibo-live-content.mjs';
import { unsubscribeAllRealtime } from './firestore-realtime.mjs';

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

window.HAIBO_FIRESTORE_DESTINATIONS = [];
window.HAIBO_CONTENT_LOADED = false;

let cmsUnsub = null;

function applyDestinations() {
  const list = Array.isArray(window.HAIBO_CONTENT?.destinations)
    ? window.HAIBO_CONTENT.destinations
    : [];
  window.DESTINATIONS = list;
  if (typeof syncHaiboDestinations === 'function') syncHaiboDestinations();
}

function applyConfigFromContent() {
  const c = window.HAIBO_CONTENT.contact || {};
  const s = window.HAIBO_CONTENT.socials || {};
  const st = window.HAIBO_CONTENT.settings || {};

  if (st?.logoUrl && typeof haiboValidMediaUrl === 'function' && haiboValidMediaUrl(st.logoUrl)) {
    HAIBO_CONFIG.logoPath = st.logoUrl;
  }
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

function syncSearchIds() {
  const ids = window.HAIBO_CONTENT.settings?.searchEnabledIds;
  const destIds = (window.HAIBO_CONTENT.destinations || []).map((d) => d.id);
  window.HAIBO_CONTENT.search.enabledDestinationIds =
    ids?.length > 0 ? ids : destIds;
}

function ensureDefaults() {
  if (typeof mergeHaiboContentWithDefaults === 'function') {
    mergeHaiboContentWithDefaults();
  } else if (!window.HAIBO_CONTENT.destinations?.length) {
    window.HAIBO_CONTENT.destinations = [];
    window.DESTINATIONS = [];
  }
}

function applyLiveContentToPage() {
  if (typeof window.applyHaiboContent === 'function') window.applyHaiboContent();
  if (typeof window.refreshHaiboLiveContent === 'function') {
    window.refreshHaiboLiveContent();
  } else if (typeof haiboBootDestinationGrids === 'function') {
    haiboBootDestinationGrids();
  }
}

function paintFromFirestoreCms(doc) {
  if (!doc) return false;

  const dests = Array.isArray(doc.destinations) ? doc.destinations : [];
  window.HAIBO_FIRESTORE_DESTINATIONS = dests.map((d) => ({
    ...d,
    id: d.id || d.slug,
  }));

  try {
    window.HAIBO_CONTENT.destinations = haiboDestinationsFromFirestoreDocs(
      window.HAIBO_FIRESTORE_DESTINATIONS
    );
  } catch (err) {
    console.error('[HAIBO] destination normalize failed', err);
    window.HAIBO_CONTENT.destinations = [];
  }

  if (doc.hero) window.HAIBO_CONTENT.hero = doc.hero;
  if (doc.about) window.HAIBO_CONTENT.about = doc.about;
  if (doc.contact) window.HAIBO_CONTENT.contact = doc.contact;
  if (doc.socials) window.HAIBO_CONTENT.socials = doc.socials;
  if (doc.settings) window.HAIBO_CONTENT.settings = doc.settings;
  if (Array.isArray(doc.gallery)) {
    window.HAIBO_CONTENT.gallery =
      typeof haiboMergeGalleryCollection === 'function'
        ? haiboMergeGalleryCollection(doc.gallery)
        : { images: doc.gallery, videos: [] };
  }
  if (Array.isArray(doc.weatherCards)) {
    window.HAIBO_CONTENT.weatherCards =
      typeof haiboMergeWeatherCardsList === 'function'
        ? haiboMergeWeatherCardsList(doc.weatherCards)
        : doc.weatherCards;
  }

  ensureDefaults();
  syncSearchIds();
  applyDestinations();
  applyConfigFromContent();
  applyLiveContentToPage();

  const first = !window.HAIBO_CONTENT_LOADED;
  window.HAIBO_CONTENT_LOADED = true;
  document.body.classList.remove('haibo-content-loading');
  document.body.classList.add('haibo-content-ready');
  if (first) {
    window.dispatchEvent(new Event('haiboContentReady'));
  }
  window.dispatchEvent(new Event('haiboContentUpdated'));
  return true;
}

export function initHaiboContentRealtime() {
  document.body.classList.add('haibo-content-loading');

  if (cmsUnsub) {
    cmsUnsub();
    cmsUnsub = null;
  }

  cmsUnsub = subscribePublicCms(
    (cms) => {
      paintFromFirestoreCms(cms);
    },
    {
      onError: (err) => {
        console.error('[HAIBO] Firestore CMS listener failed:', err);
        document.body.classList.remove('haibo-content-loading');
      },
    }
  );
}

export function teardownHaiboContentRealtime() {
  if (cmsUnsub) {
    cmsUnsub();
    cmsUnsub = null;
  }
  unsubscribeAllRealtime();
}

window.initHaiboContent = initHaiboContentRealtime;
window.teardownHaiboContentRealtime = teardownHaiboContentRealtime;

window.addEventListener('pagehide', (e) => {
  if (e.persisted) return;
  teardownHaiboContentRealtime();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initHaiboContentRealtime());
} else {
  initHaiboContentRealtime();
}
