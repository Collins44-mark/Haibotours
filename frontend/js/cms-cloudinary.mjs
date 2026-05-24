/**
 * Site CMS — one JSON file on Cloudinary. Admin save → new URL in cookie → website reads it.
 */

function cfg() {
  return globalThis.CLOUDINARY_CONFIG || {};
}

const MANIFEST_ID = 'haibo/cms/site-manifest';
const COOKIE_NAME = 'haibo_cms_delivery';

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

export function getLatestCmsDeliveryUrl() {
  try {
    const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(COOKIE_NAME);
  } catch {
    return null;
  }
}

export function setLatestCmsDeliveryUrl(url) {
  if (!url) return;
  try {
    localStorage.setItem(COOKIE_NAME, url);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(url)};path=/;max-age=2592000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

async function fetchJsonUrl(url) {
  if (!url) return null;
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchByPublicId(publicId) {
  return fetchJsonUrl(manifestUrl(publicId));
}

/** Load CMS for the public website (newest delivery URL, then fallback manifest). */
export async function fetchSiteCms() {
  const direct = getLatestCmsDeliveryUrl();
  if (direct) {
    const doc = await fetchJsonUrl(direct);
    if (doc?.destinations) return doc;
  }

  try {
    const apiRes = await fetch('/api/site-cms', { cache: 'no-store', credentials: 'include' });
    if (apiRes.ok) {
      const doc = await apiRes.json();
      if (doc && !doc.error && doc.destinations) return doc;
    }
  } catch {
    /* no API on static host */
  }

  return fetchByPublicId(MANIFEST_ID);
}

async function unsignedUpload(payload, publicId) {
  const { cloudName, uploadPreset, baseFolder = 'haibo' } = cfg();
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured.');
  }

  const fullId = publicId.includes('/') ? publicId : `${baseFolder}/${publicId}`;
  const form = new FormData();
  form.append('file', new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'site-cms.json');
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
  return body;
}

/** Save CMS and remember the Cloudinary URL so the website can load it. */
export async function uploadSiteCms(doc) {
  const payload = { ...doc, version: 1, updatedAt: Date.now() };

  try {
    const apiRes = await fetch('/api/site-cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (apiRes.ok) {
      const saved = await apiRes.json();
      if (saved._deliveryUrl) setLatestCmsDeliveryUrl(saved._deliveryUrl);
      return saved;
    }
  } catch {
    /* fall through */
  }

  const body = await unsignedUpload(payload, `cms/m-${Date.now()}`);
  const deliveryUrl = body.secure_url;
  if (!deliveryUrl) {
    throw new Error('Upload succeeded but no URL was returned.');
  }

  setLatestCmsDeliveryUrl(deliveryUrl);
  return { ...payload, _deliveryUrl: deliveryUrl };
}
