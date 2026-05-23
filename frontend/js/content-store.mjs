/**
 * Firestore realtime listeners — live public site (no refresh needed).
 */
import { getHaiboDb } from './firebase-app.mjs';
import { subscribeDocument, subscribeCollection, unsubscribeAllRealtime } from './firestore-realtime.mjs';

/** Classic scripts expose config on globalThis — bare names are not visible in ES modules. */
function firestorePaths() {
  return globalThis.FIRESTORE_PATHS || {};
}

function firebaseConfigured() {
  return globalThis.isFirebaseConfigured?.() ?? false;
}

const DOC_MAIN = 'main';
const PUBLISH_DEBOUNCE_MS = 40;
const INITIAL_LOAD_TIMEOUT_MS = 6000;

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

/** Raw Firestore destination docs — merged once into HAIBO_CONTENT.destinations */
window.HAIBO_FIRESTORE_DESTINATIONS = [];

function rebuildDestinationsFromFirestore() {
  const raw = window.HAIBO_FIRESTORE_DESTINATIONS || [];
  try {
    window.HAIBO_CONTENT.destinations =
      typeof haiboMergeDestinationsList === 'function'
        ? haiboMergeDestinationsList(raw)
        : raw;
    if (typeof syncHaiboDestinations === 'function') {
      syncHaiboDestinations();
    }
  } catch (err) {
    console.warn('[HAIBO] destination merge failed, keeping static catalog.', err);
    window.HAIBO_CONTENT.destinations =
      window.HAIBO_DESTINATIONS_STATIC?.map((x) => ({ ...x })) ||
      (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS.map((x) => ({ ...x })) : []);
  }
}

window.HAIBO_CONTENT_LOADED = false;
window.HAIBO_FIRESTORE_STATUS = {
  loading: true,
  error: null,
  listeners: 0,
};

const listenerUnsubs = [];
let initialPending = 0;
let initialComplete = false;
let initialLoadTimer = null;
let publishTimer = null;
let detailDestUnsub = null;

function setFirestoreStatus(partial) {
  Object.assign(window.HAIBO_FIRESTORE_STATUS, partial);
  const loading = Boolean(window.HAIBO_FIRESTORE_STATUS.loading);
  const ready = initialComplete && !loading;
  document.body.classList.toggle('haibo-content-loading', loading && !initialComplete);
  document.body.classList.toggle('haibo-content-ready', ready);
  window.dispatchEvent(
    new CustomEvent('haiboFirestoreStatus', { detail: { ...window.HAIBO_FIRESTORE_STATUS } })
  );
}

function trackListener(unsub) {
  listenerUnsubs.push(unsub);
  setFirestoreStatus({ listeners: listenerUnsubs.length });
  return unsub;
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

function applyDestinations() {
  if (typeof syncHaiboDestinations === 'function') {
    syncHaiboDestinations();
    return;
  }
  const staticList =
    window.HAIBO_DESTINATIONS_STATIC ||
    (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS : []);
  const list = window.HAIBO_CONTENT.destinations;
  if (Array.isArray(list) && list.length > 0) {
    const live = list
      .filter((d) => d && d.id && d.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    window.DESTINATIONS = live.length ? live : staticList;
  } else {
    window.DESTINATIONS = [...staticList];
  }
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
  } else {
    const staticDests =
      window.HAIBO_DESTINATIONS_STATIC ||
      (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS.map((x) => ({ ...x })) : []);
    if (typeof haiboMergeDestinationsList === 'function') {
      if (window.HAIBO_FIRESTORE_DESTINATIONS?.length > 0) {
        rebuildDestinationsFromFirestore();
      } else if (!window.HAIBO_CONTENT.destinations?.length) {
        window.HAIBO_CONTENT.destinations = haiboMergeDestinationsList([]);
      }
    } else if (!window.HAIBO_CONTENT.destinations?.length && staticDests.length) {
      window.HAIBO_CONTENT.destinations = staticDests.map((x) => ({ ...x }));
    }
    if (typeof haiboNormalizeGalleryObject === 'function') {
      window.HAIBO_CONTENT.gallery = haiboNormalizeGalleryObject(window.HAIBO_CONTENT.gallery);
    } else if (
      !window.HAIBO_CONTENT.gallery?.images?.length &&
      !window.HAIBO_CONTENT.gallery?.videos?.length
    ) {
      window.HAIBO_CONTENT.gallery = {
        images: typeof GALLERY_IMAGES !== 'undefined' ? [...GALLERY_IMAGES] : [],
        videos: typeof GALLERY_VIDEOS !== 'undefined' ? [...GALLERY_VIDEOS] : [],
      };
    }
    if (typeof haiboMergeWeatherCardsList === 'function') {
      window.HAIBO_CONTENT.weatherCards = haiboMergeWeatherCardsList(
        window.HAIBO_CONTENT.weatherCards
      );
    }
  }
}

function forceInitialPublish() {
  if (initialComplete) return;
  ensureDefaults();
  initialPending = 0;
  publish(true);
}

function applyLiveContentToPage() {
  if (typeof window.applyHaiboContent === 'function') window.applyHaiboContent();
  if (typeof window.refreshHaiboLiveContent === 'function') {
    window.refreshHaiboLiveContent();
  } else if (typeof haiboBootDestinationGrids === 'function') {
    haiboBootDestinationGrids();
  }
}

function publish(isInitial) {
  ensureDefaults();
  syncSearchIds();
  applyDestinations();
  applyConfigFromContent();
  applyLiveContentToPage();

  const firstLoad = !initialComplete;
  if (firstLoad) {
    initialComplete = true;
    window.HAIBO_CONTENT_LOADED = true;
    setFirestoreStatus({ loading: false, error: null });
    window.dispatchEvent(new Event('haiboContentReady'));
    console.log('[HAIBO] content ready (realtime listeners active)');
  } else {
    console.log('[HAIBO] content updated (live)');
  }
  window.dispatchEvent(new Event('haiboContentUpdated'));
}

function schedulePublish(isInitial) {
  clearTimeout(publishTimer);
  publishTimer = setTimeout(() => publish(isInitial), PUBLISH_DEBOUNCE_MS);
}

function tickInitial() {
  initialPending -= 1;
  if (initialPending <= 0) schedulePublish(true);
}

function bindDocListener(db, coll, key) {
  initialPending += 1;
  trackListener(
    subscribeDocument(db, coll, DOC_MAIN, {
      onData: (data) => {
        window.HAIBO_CONTENT[key] = data;
        if (!initialComplete) tickInitial();
        else schedulePublish(false);
      },
      onError: () => {
        ensureDefaults();
        if (!initialComplete) tickInitial();
      },
    })
  );
}

function bindCollectionListener(db, coll, applyItems) {
  initialPending += 1;
  trackListener(
    subscribeCollection(
      db,
      coll,
      {
        onData: (items) => {
          applyItems(items);
          if (!initialComplete) tickInitial();
          else schedulePublish(false);
        },
        onError: () => {
          ensureDefaults();
          if (!initialComplete) tickInitial();
        },
      },
      { orderField: 'order', orderDirection: 'asc', useOrdering: true }
    )
  );
}

function upsertDestinationInContent(data) {
  if (!data?.id) return;
  const key =
    typeof haiboNormalizeDestId === 'function'
      ? haiboNormalizeDestId(data.id)
      : String(data.id).trim().toLowerCase();
  const raw = [...(window.HAIBO_FIRESTORE_DESTINATIONS || [])];
  const idx = raw.findIndex((d) => {
    const id =
      typeof haiboNormalizeDestId === 'function' ? haiboNormalizeDestId(d.id) : d.id;
    return id === key;
  });
  const row = { ...data, id: data.id, _fromFirestore: true };
  if (idx >= 0) raw[idx] = { ...raw[idx], ...row };
  else raw.push(row);
  window.HAIBO_FIRESTORE_DESTINATIONS = raw;
  rebuildDestinationsFromFirestore();
}

/** Extra listener on destination detail pages for instant package/pricing updates. */
function bindDestinationDetailListener(db) {
  if (document.body.dataset.page !== 'destination-detail') return;
  if (typeof getDestinationIdFromLocation !== 'function') return;

  const destId = getDestinationIdFromLocation();
  if (!destId) return;

  if (detailDestUnsub) {
    try {
      detailDestUnsub();
    } catch {
      /* ignore */
    }
  }

  const paths = firestorePaths();
  if (!paths.destinations) return;

  detailDestUnsub = trackListener(
    subscribeDocument(db, paths.destinations, destId, {
      onData: (data) => {
        if (!data) return;
        upsertDestinationInContent({ id: destId, ...data, _fromFirestore: true });
        schedulePublish(false);
      },
    })
  );
}

function startRealtimeListeners() {
  const db = getHaiboDb();
  const paths = firestorePaths();
  if (!db) {
    ensureDefaults();
    publish(true);
    return;
  }
  if (!paths.destinations) {
    console.error('[HAIBO] FIRESTORE_PATHS missing — load js/firebase-config.js before content-store.mjs');
    ensureDefaults();
    publish(true);
    return;
  }

  setFirestoreStatus({ loading: true, error: null });

  bindDocListener(db, paths.hero, 'hero');
  bindDocListener(db, paths.about, 'about');
  bindDocListener(db, paths.contact, 'contact');
  bindDocListener(db, paths.socials, 'socials');
  bindDocListener(db, paths.settings, 'settings');

  bindCollectionListener(db, paths.destinations, (items) => {
    window.HAIBO_FIRESTORE_DESTINATIONS = (items || []).map((d) => ({
      ...d,
      _fromFirestore: true,
    }));
    rebuildDestinationsFromFirestore();
    if (items?.length) {
      console.log('[HAIBO] destinations from Firestore:', items.length);
    }
  });

  bindCollectionListener(db, paths.gallery, (items) => {
    window.HAIBO_CONTENT.gallery =
      typeof haiboMergeGalleryCollection === 'function'
        ? haiboMergeGalleryCollection(items)
        : {
            images: typeof GALLERY_IMAGES !== 'undefined' ? [...GALLERY_IMAGES] : [],
            videos: typeof GALLERY_VIDEOS !== 'undefined' ? [...GALLERY_VIDEOS] : [],
          };
  });

  bindCollectionListener(db, paths.weatherCards, (items) => {
    window.HAIBO_CONTENT.weatherCards =
      typeof haiboMergeWeatherCardsList === 'function'
        ? haiboMergeWeatherCardsList(items)
        : items.filter((w) => w && w.active !== false);
  });

  bindDestinationDetailListener(db);

  initialLoadTimer = setTimeout(() => {
    if (!initialComplete) {
      console.warn('[HAIBO] Firestore init timeout — showing local defaults.');
      forceInitialPublish();
    }
  }, INITIAL_LOAD_TIMEOUT_MS);
}

export function teardownHaiboContentRealtime() {
  clearTimeout(publishTimer);
  clearTimeout(initialLoadTimer);
  if (detailDestUnsub) {
    try {
      detailDestUnsub();
    } catch {
      /* ignore */
    }
    detailDestUnsub = null;
  }
  listenerUnsubs.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
  listenerUnsubs.length = 0;
  unsubscribeAllRealtime();
}

export function initHaiboContentRealtime() {
  ensureDefaults();
  applyDestinations();

  if (!firebaseConfigured()) {
    setFirestoreStatus({ loading: false, error: 'Firebase not configured' });
    publish(true);
    return;
  }

  try {
    startRealtimeListeners();
  } catch (err) {
    console.warn('[HAIBO] Firebase realtime failed, using defaults.', err);
    setFirestoreStatus({ loading: false, error: err?.message || 'Realtime failed' });
    ensureDefaults();
    publish(true);
  }
}

window.initHaiboContent = initHaiboContentRealtime;
window.teardownHaiboContentRealtime = teardownHaiboContentRealtime;

window.addEventListener('pagehide', (e) => {
  if (e.persisted) return;
  teardownHaiboContentRealtime();
});

export { subscribeDocument, subscribeCollection } from './firestore-realtime.mjs';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHaiboContentRealtime);
} else {
  initHaiboContentRealtime();
}
