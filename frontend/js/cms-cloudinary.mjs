/**
 * Site CMS — JSON on Cloudinary. Public site loads via /api/site-cms (no 404 spam).
 */

function cfg() {
  return globalThis.CLOUDINARY_CONFIG || {};
}

const LIVE_ID = 'haibo/cms/site-live';
const SEED_ID = 'haibo/cms/site-manifest';

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

function manifestUrl(publicId) {
  const { cloudName } = cfg();
  if (!cloudName) return null;
  return `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}.json`;
}

async function fetchByPublicId(publicId) {
  const url = manifestUrl(publicId);
  if (!url) return null;
  const res = await fetch(`${url}?_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function pickNewest(docs) {
  let best = null;
  for (const doc of docs) {
    if (!doc || typeof doc !== 'object') continue;
    if (!best || (doc.updatedAt || 0) > (best.updatedAt || 0)) {
      best = doc;
    }
  }
  return best;
}

/** Load newest CMS document (API first, then stable Cloudinary URLs only). */
export async function fetchSiteCms() {
  try {
    const apiRes = await fetch('/api/site-cms', { cache: 'no-store' });
    if (apiRes.ok) {
      const doc = await apiRes.json();
      if (doc && !doc.error) return doc;
    }
  } catch {
    /* static hosting without API — fall through */
  }

  const docs = await Promise.all([fetchByPublicId(LIVE_ID), fetchByPublicId(SEED_ID)]);
  return pickNewest(docs);
}

async function unsignedUpload(payload, publicId) {
  const { cloudName, uploadPreset, baseFolder = 'haibo' } = cfg();
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured.');
  }

  const fullId = publicId.startsWith(baseFolder) ? publicId : `${baseFolder}/${publicId}`;
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const form = new FormData();
  form.append('file', blob, 'site-cms.json');
  form.append('upload_preset', uploadPreset);
  form.append('public_id', fullId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST',
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error?.message || 'Could not update the website.');
  }
  return { body, publicId: body.public_id || fullId };
}

/**
 * Save CMS — tries API (overwrite), then unsigned uploads to site-live + timestamped backup.
 */
export async function uploadSiteCms(doc) {
  const payload = { ...doc, version: 1, updatedAt: Date.now() };

  try {
    const apiRes = await fetch('/api/site-cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (apiRes.ok) {
      return await apiRes.json();
    }
  } catch {
    /* continue with direct Cloudinary */
  }

  const base = cfg().baseFolder || 'haibo';
  const backupId = `${base}/cms/m-${Date.now()}`;
  await unsignedUpload(payload, backupId);

  try {
    await unsignedUpload(payload, LIVE_ID);
  } catch (err) {
    console.warn('[HAIBO] site-live upload failed (enable Overwrite on Cloudinary upload preset):', err.message);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('haibo_cms_latest_id', backupId);
  }

  return payload;
}
