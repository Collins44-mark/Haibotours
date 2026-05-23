/**
 * Firestore realtime listeners — live public site (no refresh needed).
 */
import { getHaiboDb } from './firebase-app.mjs';
import { subscribeDocument, subscribeCollection, unsubscribeAllRealtime } from './firestore-realtime.mjs';
import { haiboDestinationsFromFirestoreDocs } from './haibo-live-content.mjs';
import { tryLoadCmsPublicManifest } from './cms-public-manifest.mjs';

// #region agent log
function dbgLog(hypothesisId, location, message, data = {}) {
  const entry = {
    sessionId: 'ad576b',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  try {
    const arr = JSON.parse(sessionStorage.getItem('haibo_dbg') || '[]');
    arr.push(entry);
    sessionStorage.setItem('haibo_dbg', JSON.stringify(arr.slice(-40)));
  } catch {
    /* ignore */
  }
  fetch('http://127.0.0.1:7522/ingest/2f5036d2-b0da-4c2a-a7f2-17706d91dcab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ad576b' },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
// #endregion

/** Classic scripts expose config on globalThis — bare names are not visible in ES modules. */
function firestorePaths() {
  return globalThis.FIRESTORE_PATHS || {};
}

function firebaseConfigured() {
  return globalThis.isFirebaseConfigured?.() ?? false;
}

const FIRESTORE_RULES_CONSOLE_URL =
  'https://console.firebase.google.com/project/haibo-tours/firestore/databases/-default-/rules';

function ensureCmsStatusBanner() {
  let el = document.getElementById('haibo-firestore-perm-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'haibo-firestore-perm-banner';
    el.setAttribute('role', 'status');
    el.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:12px 16px;font-size:0.85rem;text-align:center;line-height:1.5';
    document.body.appendChild(el);
  }
  return el;
}

function updateCmsStatusBanner({ manifestOk = false, count = 0 } = {}) {
  const el = ensureCmsStatusBanner();
  if (manifestOk && count > 0) {
    el.style.background = '#1e3a2f';
    el.style.color = '#d1fae5';
    el.innerHTML =
      `Live site: <strong>${count}</strong> destinations from CMS manifest. ` +
      'Edits appear after you save in admin (or click <strong>Publish to website</strong>). ' +
      `<a href="${FIRESTORE_RULES_CONSOLE_URL}" target="_blank" rel="noopener noreferrer" style="color:#6ee7b7;text-decoration:underline">Optional: enable Firestore realtime</a>`;
    return;
  }
  el.setAttribute('role', 'alert');
  el.style.background = '#7f1d1d';
  el.style.color = '#fff';
  el.innerHTML =
    'Firestore public read is blocked on <strong>haibo-tours</strong>. ' +
    'In admin: <strong>Import website defaults</strong> or <strong>Publish to website</strong>. ' +
    'Or publish <code>firebase/COPY_PASTE_RULES.txt</code>. ' +
    `<a href="${FIRESTORE_RULES_CONSOLE_URL}" target="_blank" rel="noopener noreferrer" style="color:#fecaca;text-decoration:underline">Open Rules editor</a>`;
}

let manifestFallbackInFlight = false;
let manifestPollTimer = null;

function startManifestPolling() {
  if (manifestPollTimer) return;
  manifestPollTimer = setInterval(() => {
    void refreshManifestFromCloud('poll', true);
  }, 45000);
}

async function refreshManifestFromCloud(reason, force = false) {
  if (manifestFallbackInFlight) return;
  manifestFallbackInFlight = true;
  // #region agent log
  dbgLog('F', 'content-store.mjs:refreshManifest', 'attempt', { reason, force });
  // #endregion
  try {
    const result = await tryLoadCmsPublicManifest({ force });
    // #region agent log
    dbgLog('F', 'content-store.mjs:refreshManifest', 'result', result);
    // #endregion
    if (!result.ok) {
      updateCmsStatusBanner({ manifestOk: false });
      return;
    }
    if (!result.skipped) {
      console.log('[HAIBO] CMS manifest applied', result.count, 'destinations', reason);
      rebuildDestinationsFromFirestore();
      schedulePublish(false);
    }
    updateCmsStatusBanner({ manifestOk: true, count: result.count });
    startManifestPolling();
  } finally {
    manifestFallbackInFlight = false;
  }
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

function paintDestinationsLive() {
  applyDestinations();
  if (typeof haiboBootDestinationGrids === 'function') haiboBootDestinationGrids();
  if (typeof window.refreshHaiboLiveContent === 'function') {
    window.refreshHaiboLiveContent();
  }
}

function rebuildDestinationsFromFirestore() {
  const raw = window.HAIBO_FIRESTORE_DESTINATIONS || [];
  console.log('[HAIBO] Realtime update received — rebuilding destinations', raw.length);
  // #region agent log
  dbgLog('B', 'content-store.mjs:rebuildDestinations', 'rebuild from firestore', {
    count: raw.length,
    ids: raw.slice(0, 8).map((d) => d.id),
  });
  // #endregion
  try {
    const list = haiboDestinationsFromFirestoreDocs(raw);
    window.HAIBO_CONTENT.destinations = list;
    window.DESTINATIONS = list;
    if (typeof syncHaiboDestinations === 'function') syncHaiboDestinations();
    paintDestinationsLive();
    // #region agent log
    dbgLog('D', 'content-store.mjs:rebuildDestinations', 'painted live', {
      rendered: list.length,
      first: list[0]?.name,
    });
    // #endregion
  } catch (err) {
    console.error('[HAIBO] destination normalize failed', err);
    window.HAIBO_CONTENT.destinations = [];
    window.DESTINATIONS = [];
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
  const list = Array.isArray(window.HAIBO_CONTENT?.destinations)
    ? window.HAIBO_CONTENT.destinations
    : [];
  window.DESTINATIONS = list;
  if (typeof syncHaiboDestinations === 'function') syncHaiboDestinations();
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
    if (window.HAIBO_FIRESTORE_DESTINATIONS?.length > 0) {
      rebuildDestinationsFromFirestore();
    } else if (!window.HAIBO_CONTENT.destinations?.length) {
      window.HAIBO_CONTENT.destinations = [];
      window.DESTINATIONS = [];
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
    // #region agent log
    dbgLog('D', 'content-store.mjs:publish', 'live publish', {
      destCount: window.HAIBO_CONTENT?.destinations?.length ?? 0,
    });
    // #endregion
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
      onError: (err) => {
        console.warn('[HAIBO] document listener error', key, err?.message || err);
        if (!initialComplete) tickInitial();
      },
    })
  );
}

function bindCollectionListener(db, coll, applyItems, collectionOptions = {}) {
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
        onError: (err) => {
          console.error('[HAIBO] collection listener error', coll, err);
          // #region agent log
          dbgLog('A', 'content-store.mjs:bindCollectionListener', 'listener error', {
            coll,
            code: err?.code,
            message: err?.message,
          });
          // #endregion
          if (err?.code === 'permission-denied') {
            setFirestoreStatus({ loading: false, error: 'permission-denied' });
            void refreshManifestFromCloud(`permission-denied:${coll}`);
          }
          if (!initialComplete) tickInitial();
        },
      },
      {
        orderField: 'order',
        orderDirection: 'asc',
        useOrdering: true,
        ...collectionOptions,
      }
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
    console.error('[HAIBO] Firestore DB unavailable');
    // #region agent log
    dbgLog('A', 'content-store.mjs:startRealtimeListeners', 'no db', {});
    // #endregion
    setFirestoreStatus({ loading: false, error: 'Firestore unavailable' });
    publish(true);
    return;
  }
  if (!paths.destinations) {
    console.error('[HAIBO] FIRESTORE_PATHS missing — load js/firebase-config.js before content-store.mjs');
    setFirestoreStatus({ loading: false, error: 'FIRESTORE_PATHS missing' });
    publish(true);
    return;
  }

  console.log('[HAIBO] Fetching destinations from Firestore');
  // #region agent log
  dbgLog('A', 'content-store.mjs:startRealtimeListeners', 'listeners starting', {
    destinations: paths.destinations,
  });
  // #endregion

  setFirestoreStatus({ loading: true, error: null });

  bindDocListener(db, paths.hero, 'hero');
  bindDocListener(db, paths.about, 'about');
  bindDocListener(db, paths.contact, 'contact');
  bindDocListener(db, paths.socials, 'socials');
  bindDocListener(db, paths.settings, 'settings');

  bindCollectionListener(
    db,
    paths.destinations,
    (items) => {
      const n = items?.length ?? 0;
      console.log('[HAIBO] Realtime update received — destinations collection', n);
      // #region agent log
      dbgLog('A', 'content-store.mjs:destinations', 'snapshot ok', { count: n });
      // #endregion
      window.HAIBO_FIRESTORE_DESTINATIONS = items || [];
      rebuildDestinationsFromFirestore();
    },
    { useOrdering: false }
  );

  bindCollectionListener(db, paths.gallery, (items) => {
    window.HAIBO_CONTENT.gallery =
      typeof haiboMergeGalleryCollection === 'function'
        ? haiboMergeGalleryCollection(items)
        : { images: [], videos: [] };
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
      console.warn('[HAIBO] Firestore init timeout — trying manifest fallback.');
      void refreshManifestFromCloud('init-timeout').finally(() => {
        if (!initialComplete) forceInitialPublish();
      });
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

export async function initHaiboContentRealtime() {
  window.HAIBO_CONTENT.destinations = [];
  window.DESTINATIONS = [];

  if (!firebaseConfigured()) {
    setFirestoreStatus({ loading: false, error: 'Firebase not configured' });
    publish(true);
    return;
  }

  try {
    startRealtimeListeners();
  } catch (err) {
    console.error('[HAIBO] Firebase realtime failed', err);
    setFirestoreStatus({ loading: false, error: err?.message || 'Realtime failed' });
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
  document.addEventListener('DOMContentLoaded', () => void initHaiboContentRealtime());
} else {
  void initHaiboContentRealtime();
}
