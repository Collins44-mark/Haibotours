/**
 * Site CMS — JSON on Cloudinary + Firestore pointer (all devices read the same URL).
 */
import { fetchCmsPointer, publishCmsPointer } from './cms-pointer.mjs';

function cfg() {
  return globalThis.CLOUDINARY_CONFIG || {};
}

const MANIFEST_ID = 'haibo/cms/site-manifest';
const COOKIE_NAME = 'haibo_cms_delivery';
const MINUTE_BUCKETS = 30;
const MINUTES_PER_DAY = 1440;

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

export function isCmsDocument(doc) {
  if (!doc || typeof doc !== 'object' || doc.error) return false;
  return (
    doc.version != null ||
    doc.updatedAt != null ||
    doc.hero != null ||
    doc.about != null ||
    doc.contact != null ||
    doc.settings != null ||
    Array.isArray(doc.destinations) ||
    Array.isArray(doc.gallery)
  );
}

export function pickNewestCms(docs) {
  let best = null;
  for (const doc of docs) {
    if (!isCmsDocument(doc)) continue;
    if (!best || (doc.updatedAt || 0) > (best.updatedAt || 0)) {
      best = doc;
    }
  }
  return best;
}

/** Probe recent minute buckets (works on all devices without cookies). */
export async function fetchRecentMinuteSlotCms() {
  const nowMin = Math.floor(Date.now() / 60000);
  const fetches = [];
  for (let i = 0; i < MINUTE_BUCKETS; i++) {
    const slot = ((nowMin - i) % MINUTES_PER_DAY + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    fetches.push(fetchByPublicId(`haibo/cms/v-${slot}`));
  }
  return (await Promise.all(fetches)).filter(isCmsDocument);
}

/** Load CMS — global Firestore pointer first, then API, slots, cookie, manifest. */
export async function fetchSiteCms() {
  const pointer = await fetchCmsPointer();
  if (pointer?.deliveryUrl) {
    const fromPointer = await fetchJsonUrl(pointer.deliveryUrl);
    if (isCmsDocument(fromPointer)) return fromPointer;
  }

  try {
    const apiRes = await fetch('/api/site-cms', { cache: 'no-store' });
    if (apiRes.ok) {
      const doc = await apiRes.json();
      if (isCmsDocument(doc)) return doc;
    }
  } catch {
    /* static host without API */
  }

  const slotDocs = await fetchRecentMinuteSlotCms();
  const fromSlots = pickNewestCms(slotDocs);
  if (fromSlots) return fromSlots;

  const direct = getLatestCmsDeliveryUrl();
  if (direct) {
    const doc = await fetchJsonUrl(direct);
    if (isCmsDocument(doc)) return doc;
  }

  const manifest = await fetchByPublicId(MANIFEST_ID);
  return isCmsDocument(manifest) ? manifest : null;
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

/** Publish CMS for every visitor (timestamped backup + current minute slot). */
async function publishToSharedSlots(payload) {
  const minuteSlot = Math.floor(Date.now() / 60000) % MINUTES_PER_DAY;
  const backup = await unsignedUpload(payload, `cms/m-${Date.now()}`);
  try {
    await unsignedUpload(payload, `cms/v-${minuteSlot}`);
  } catch {
    /* same-minute slot may already exist — backup still has the save */
  }
  return backup;
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
      await rememberDelivery(saved._deliveryUrl, saved.updatedAt);
      return saved;
    }
  } catch {
    /* fall through */
  }

  const body = await publishToSharedSlots(payload);
  const deliveryUrl = body.secure_url;
  if (!deliveryUrl) {
    throw new Error('Upload succeeded but no URL was returned.');
  }

  await rememberDelivery(deliveryUrl, payload.updatedAt);
  return { ...payload, _deliveryUrl: deliveryUrl };
}

function rememberDelivery(deliveryUrl, updatedAt) {
  if (deliveryUrl) setLatestCmsDeliveryUrl(deliveryUrl);
  return publishCmsPointer({ deliveryUrl, updatedAt });
}
