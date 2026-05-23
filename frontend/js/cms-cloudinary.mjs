/**
 * Site CMS — stored as JSON on Cloudinary. Public site and admin both use this.
 */

function cfg() {
  return globalThis.CLOUDINARY_CONFIG || {};
}

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

function recentManifestIds() {
  const base = cfg().baseFolder || 'haibo';
  const hour = Math.floor(Date.now() / 3600000);
  const ids = [`${base}/cms/site-manifest`];
  for (let i = 0; i < 8; i++) {
    ids.push(`${base}/cms/m-${hour - i}`);
  }
  return ids;
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

/** Load newest CMS document from Cloudinary. */
export async function fetchSiteCms() {
  const results = await Promise.all(recentManifestIds().map((id) => fetchByPublicId(id)));
  let best = null;
  for (const doc of results) {
    if (!doc) continue;
    if (!best || (doc.updatedAt || 0) > (best.updatedAt || 0)) {
      best = doc;
    }
  }
  return best;
}

/** Upload CMS JSON (unsigned preset; each save uses a unique public_id). */
export async function uploadSiteCms(doc) {
  const { cloudName, uploadPreset, baseFolder = 'haibo' } = cfg();
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured.');
  }
  const payload = { ...doc, version: 1, updatedAt: Date.now() };
  const publicId = `${baseFolder}/cms/m-${Math.floor(Date.now() / 3600000)}-${Date.now()}`;
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const form = new FormData();
  form.append('file', blob, 'site-cms.json');
  form.append('upload_preset', uploadPreset);
  form.append('public_id', publicId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST',
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error?.message || 'Could not update the website.');
  }
  return payload;
}
