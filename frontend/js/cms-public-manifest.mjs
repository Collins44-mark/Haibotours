/**
 * Public CMS fallback when Firestore rules block unauthenticated reads.
 * Admin publishes a JSON manifest to Cloudinary after each save.
 */

function cloudinaryConfig() {
  return globalThis.CLOUDINARY_CONFIG || {};
}

export function getCmsPublicManifestUrl() {
  const { cloudName, baseFolder = 'haibo' } = cloudinaryConfig();
  if (!cloudName) return null;
  const id = `${baseFolder}/cms/public-content`;
  return `https://res.cloudinary.com/${cloudName}/raw/upload/${id}.json`;
}

export async function fetchCmsPublicManifest() {
  const base = getCmsPublicManifestUrl();
  if (!base) return null;
  const res = await fetch(`${base}?_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
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

export async function tryLoadCmsPublicManifest() {
  const manifest = await fetchCmsPublicManifest();
  const applied = applyCmsPublicManifest(manifest);
  return {
    ok: applied,
    count: applied ? window.HAIBO_FIRESTORE_DESTINATIONS?.length ?? 0 : 0,
    updatedAt: manifest?.updatedAt ?? null,
  };
}
