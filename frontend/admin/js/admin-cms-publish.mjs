/**
 * Publishes full site CMS JSON to Cloudinary for public visitors when Firestore read rules are locked.
 */
import { dbList, dbGetDocOptional, ADMIN_DOC } from './admin-db.mjs';
import { cloudinaryUploadRawJson } from './admin-cloudinary.mjs';
import { adminToast } from './admin-db.mjs';

function paths() {
  return globalThis.FIRESTORE_PATHS || {};
}

export async function buildCmsPublicManifest() {
  const p = paths();
  const destinations = p.destinations ? await dbList(p.destinations) : [];
  const [hero, about, contact, socials, settings] = await Promise.all([
    p.hero ? dbGetDocOptional(p.hero, ADMIN_DOC) : null,
    p.about ? dbGetDocOptional(p.about, ADMIN_DOC) : null,
    p.contact ? dbGetDocOptional(p.contact, ADMIN_DOC) : null,
    p.socials ? dbGetDocOptional(p.socials, ADMIN_DOC) : null,
    p.settings ? dbGetDocOptional(p.settings, ADMIN_DOC) : null,
  ]);
  const gallery = p.gallery ? await dbList(p.gallery) : [];
  const weatherCards = p.weatherCards ? await dbList(p.weatherCards) : [];

  return {
    version: 1,
    updatedAt: Date.now(),
    destinations,
    hero,
    about,
    contact,
    socials,
    settings,
    gallery,
    weatherCards,
  };
}

/** Push current Firestore CMS to the public manifest URL (Cloudinary). */
export async function publishPublicCmsManifest(options = {}) {
  const { silent = false } = options;
  const manifest = await buildCmsPublicManifest();
  if (!manifest.destinations?.length) {
    if (!silent) {
      adminToast('Save at least one destination before publishing to the website.', 'error');
    }
    return { ok: false, reason: 'no-destinations' };
  }

  const result = await cloudinaryUploadRawJson(manifest, 'cms/public-content');
  console.log('[HAIBO] Public CMS manifest published', result.secure_url);
  if (!silent) {
    adminToast('Website content published (live manifest).', 'success');
  }
  return { ok: true, url: result.secure_url };
}
