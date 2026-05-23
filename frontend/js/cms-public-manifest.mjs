/**
 * Public CMS fallback when Firestore rules block unauthenticated reads.
 * Admin publishes a JSON manifest to Cloudinary after each save.
 */

function cloudinaryConfig() {
  return globalThis.CLOUDINARY_CONFIG || {};
}

function manifestUrlForPublicId(publicId) {
  const { cloudName } = cloudinaryConfig();
  if (!cloudName) return null;
  return `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}.json`;
}

/** Unsigned uploads cannot overwrite — try stable seed file, then recent hour buckets. */
function recentManifestPublicIds() {
  const { baseFolder = 'haibo' } = cloudinaryConfig();
  const hour = Math.floor(Date.now() / 3600000);
  const ids = [`${baseFolder}/cms/site-manifest`];
  for (let i = 0; i < 6; i++) {
    ids.push(`${baseFolder}/cms/m-${hour - i}`);
  }
  return ids;
}

async function fetchManifestByPublicId(publicId) {
  const url = manifestUrlForPublicId(publicId);
  if (!url) return null;
  const res = await fetch(`${url}?_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchCmsPublicManifest() {
  const ids = recentManifestPublicIds();
  const results = await Promise.all(ids.map((id) => fetchManifestByPublicId(id)));
  let best = null;
  for (const manifest of results) {
    if (!manifest?.destinations?.length) continue;
    if (!best || (manifest.updatedAt || 0) > (best.updatedAt || 0)) {
      best = manifest;
    }
  }
  return best;
}

/**
 * Apply manifest into global HAIBO_CONTENT (caller should rebuild destinations + publish).
 */
export function applyCmsPublicManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') return false;

  const dests = Array.isArray(manifest.destinations) ? manifest.destinations : [];
  if (!dests.length) return false;

  window.HAIBO_CMS_MANIFEST_MODE = true;
  window.HAIBO_FIRESTORE_DESTINATIONS = dests.map((d) => ({
    ...d,
    id: d.id || d.slug,
    _fromFirestore: true,
  }));

  const c = window.HAIBO_CONTENT || {};
  if (manifest.hero) c.hero = manifest.hero;
  if (manifest.about) c.about = manifest.about;
  if (manifest.contact) c.contact = manifest.contact;
  if (manifest.socials) c.socials = manifest.socials;
  if (manifest.settings) c.settings = manifest.settings;
  if (Array.isArray(manifest.gallery)) {
    c.gallery =
      typeof haiboMergeGalleryCollection === 'function'
        ? haiboMergeGalleryCollection(manifest.gallery)
        : { images: manifest.gallery, videos: [] };
  }
  if (Array.isArray(manifest.weatherCards)) {
    c.weatherCards =
      typeof haiboMergeWeatherCardsList === 'function'
        ? haiboMergeWeatherCardsList(manifest.weatherCards)
        : manifest.weatherCards;
  }
  window.HAIBO_CONTENT = c;
  return true;
}

let lastAppliedManifestAt = 0;

export async function tryLoadCmsPublicManifest(options = {}) {
  const { force = false } = options;
  const manifest = await fetchCmsPublicManifest();
  if (!manifest) {
    return { ok: false, count: 0, updatedAt: null, skipped: false };
  }
  const updatedAt = manifest.updatedAt ?? 0;
  if (!force && lastAppliedManifestAt && updatedAt <= lastAppliedManifestAt) {
    return {
      ok: true,
      count: window.HAIBO_FIRESTORE_DESTINATIONS?.length ?? 0,
      updatedAt,
      skipped: true,
    };
  }
  const applied = applyCmsPublicManifest(manifest);
  if (applied) lastAppliedManifestAt = updatedAt;
  return {
    ok: applied,
    count: applied ? window.HAIBO_FIRESTORE_DESTINATIONS?.length ?? 0 : 0,
    updatedAt,
    skipped: false,
  };
}
