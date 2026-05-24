/**
 * Admin CMS — Firestore source of truth (no Cloudinary JSON, no localStorage CMS).
 */
import { emptyCmsDocument } from '../../js/cms-firestore.mjs';
import {
  adminToast,
  dbSetDoc,
  dbGetDocOptional,
  dbListOptional,
  dbDeleteDoc,
  sanitizeFirestoreData,
  slugify,
} from './admin-db.mjs';

window.HAIBO_ADMIN_CMS = emptyCmsDocument();

function paths() {
  return globalThis.FIRESTORE_PATHS || {};
}

export function getAdminCms() {
  return window.HAIBO_ADMIN_CMS;
}

export async function loadAdminCms() {
  const p = paths();
  const [hero, about, contact, socials, settings, destinations, gallery, weatherCards] =
    await Promise.all([
      dbGetDocOptional(p.hero, 'main'),
      dbGetDocOptional(p.about, 'main'),
      dbGetDocOptional(p.contact, 'main'),
      dbGetDocOptional(p.socials, 'main'),
      dbGetDocOptional(p.settings, 'main'),
      dbListOptional(p.destinations),
      dbListOptional(p.gallery),
      dbListOptional(p.weatherCards),
    ]);

  window.HAIBO_ADMIN_CMS = {
    ...emptyCmsDocument(),
    hero,
    about,
    contact,
    socials,
    settings,
    destinations: destinations || [],
    gallery: gallery || [],
    weatherCards: weatherCards || [],
    updatedAt: Date.now(),
  };

  console.log('[HAIBO] Loaded CMS from Firestore', {
    destinations: window.HAIBO_ADMIN_CMS.destinations.length,
    gallery: window.HAIBO_ADMIN_CMS.gallery.length,
  });

  return window.HAIBO_ADMIN_CMS;
}

/** Write full in-memory CMS to Firestore (all sections). */
export async function syncCmsToWebsite(options = {}) {
  const { quiet = false } = options;
  const cms = getAdminCms();
  const p = paths();
  const ts = Date.now();

  try {
    if (cms.hero) await dbSetDoc(p.hero, cms.hero, 'main');
    if (cms.about) await dbSetDoc(p.about, cms.about, 'main');
    if (cms.contact) await dbSetDoc(p.contact, cms.contact, 'main');
    if (cms.socials) await dbSetDoc(p.socials, cms.socials, 'main');
    if (cms.settings) await dbSetDoc(p.settings, cms.settings, 'main');

    for (const row of cms.destinations || []) {
      const id = String(row.id || '').trim();
      if (!id) continue;
      await dbSetDoc(p.destinations, { ...row, id, slug: id }, id);
    }

    for (const row of cms.gallery || []) {
      const id = String(row.id || '').trim();
      if (!id) continue;
      await dbSetDoc(p.gallery, row, id);
    }

    for (const row of cms.weatherCards || []) {
      const id = String(row.id || '').trim();
      if (!id) continue;
      await dbSetDoc(p.weatherCards, row, id);
    }

    cms.updatedAt = ts;
    console.log('[HAIBO] Firestore updated successfully — all CMS sections');
    if (!quiet) {
      adminToast('Saved — live on all devices', 'success');
    }
    return cms;
  } catch (err) {
    const msg = err?.message || 'Firestore save failed';
    if (!quiet) adminToast(msg, 'error');
    throw err;
  }
}

/** Save one destination document to Firestore. */
export async function saveDestinationToFirestore(row) {
  const p = paths();
  const id = slugify(String(row.id || row.name || '').trim());
  if (!id) throw new Error('Destination ID (slug) is required');
  const clean = sanitizeFirestoreData({
    ...row,
    id,
    slug: id,
    active: row.active !== false,
    status: row.active !== false ? 'published' : 'draft',
    published: row.active !== false,
    updatedAt: Date.now(),
  });
  await dbSetDoc(p.destinations, clean, id);
  console.log('[HAIBO] Firestore updated successfully', `destinations/${id}`);
  return clean;
}

/** Remove destination from Firestore. */
export async function deleteDestinationFromFirestore(id) {
  const p = paths();
  await dbDeleteDoc(p.destinations, id);
  console.log('[HAIBO] Firestore deleted', `destinations/${id}`);
}

export function upsertDestinationInCms(row) {
  const cms = getAdminCms();
  const id = slugify(String(row.id || row.name || '').trim());
  const list = [...(cms.destinations || [])];
  const idx = list.findIndex((d) => slugify(d.id) === id);
  const entry = {
    ...row,
    id,
    slug: id,
    active: row.active !== false,
    status: row.active !== false ? 'published' : 'draft',
    published: row.active !== false,
    updatedAt: Date.now(),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  cms.destinations = list;
  return entry;
}

export function removeDestinationFromCms(id) {
  const key = slugify(String(id || '').trim());
  const cms = getAdminCms();
  cms.destinations = (cms.destinations || []).filter((d) => slugify(d.id) !== key);
}

export function getDeletedDestinationIds() {
  const ids = getAdminCms().settings?.deletedDestinationIds;
  if (!Array.isArray(ids)) return [];
  return ids.map((x) => slugify(String(x).trim())).filter(Boolean);
}

export async function addDeletedDestinationId(id) {
  const key = slugify(String(id || '').trim());
  if (!key) return;
  const p = paths();
  const cms = getAdminCms();
  const settings = { ...(cms.settings || {}), updatedAt: Date.now() };
  const set = new Set([...(settings.deletedDestinationIds || []).map((x) => slugify(String(x))), key]);
  settings.deletedDestinationIds = [...set];
  cms.settings = settings;
  await dbSetDoc(p.settings, sanitizeFirestoreData(settings), 'main');
}

export async function removeDeletedDestinationId(id) {
  const key = slugify(String(id || '').trim());
  if (!key) return;
  const p = paths();
  const cms = getAdminCms();
  const settings = { ...(cms.settings || {}) };
  const list = (settings.deletedDestinationIds || [])
    .map((x) => slugify(String(x)))
    .filter((x) => x && x !== key);
  settings.deletedDestinationIds = list;
  settings.updatedAt = Date.now();
  cms.settings = settings;
  await dbSetDoc(p.settings, sanitizeFirestoreData(settings), 'main');
}

export function getDestinationFromCms(id) {
  if (!id) return null;
  const key = slugify(String(id).trim());
  return (
    (getAdminCms().destinations || []).find((d) => slugify(d.id) === key) || null
  );
}

export function listDestinationsForAdmin() {
  return [...(getAdminCms().destinations || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
}

/** Save a single top-level section doc (hero, about, contact, …). */
export async function saveSectionToFirestore(sectionKey, data) {
  const p = paths();
  const coll = p[sectionKey];
  if (!coll) throw new Error(`Unknown section: ${sectionKey}`);
  await dbSetDoc(coll, data, 'main');
  console.log('[HAIBO] Firestore updated successfully', `${coll}/main`);
}

export async function deleteGalleryFromFirestore(id) {
  await dbDeleteDoc(paths().gallery, id);
  console.log('[HAIBO] Firestore deleted', `gallery/${id}`);
}

export async function deleteWeatherFromFirestore(id) {
  await dbDeleteDoc(paths().weatherCards, id);
  console.log('[HAIBO] Firestore deleted', `weatherCards/${id}`);
}

export async function saveGalleryItemToFirestore(item) {
  const id = String(item.id || '').trim();
  if (!id) throw new Error('Gallery item id required');
  await dbSetDoc(paths().gallery, item, id);
  console.log('[HAIBO] Firestore updated successfully', `gallery/${id}`);
}

export async function saveWeatherCardToFirestore(row) {
  const id = String(row.id || '').trim();
  if (!id) throw new Error('Weather card id required');
  await dbSetDoc(paths().weatherCards, row, id);
  console.log('[HAIBO] Firestore updated successfully', `weatherCards/${id}`);
}
