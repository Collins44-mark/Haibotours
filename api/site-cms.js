/**
 * HAIBO live CMS API — latest content for all devices (not browser cookies).
 * Optional: CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET for signed manifest overwrite + m-* listing.
 */
import { createHash } from 'node:crypto';

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'dae3rpnmg';
const MANIFEST_ID = 'haibo/cms/site-manifest';
const MINUTE_BUCKETS = 30;
const MINUTES_PER_DAY = 1440;

function deliveryUrl(publicId) {
  return `https://res.cloudinary.com/${CLOUD}/raw/upload/${publicId}.json`;
}

async function fetchJsonUrl(url) {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchJsonByPublicId(publicId) {
  return fetchJsonUrl(deliveryUrl(publicId));
}

function isCmsDocument(doc) {
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

function pickNewest(docs) {
  let best = null;
  for (const doc of docs) {
    if (!isCmsDocument(doc)) continue;
    if (!best || (doc.updatedAt || 0) > (best.updatedAt || 0)) {
      best = doc;
    }
  }
  return best;
}

async function fetchRecentMinuteSlots() {
  const nowMin = Math.floor(Date.now() / 60000);
  const ids = [];
  for (let i = 0; i < MINUTE_BUCKETS; i++) {
    const slot = ((nowMin - i) % MINUTES_PER_DAY + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    ids.push(`haibo/cms/v-${slot}`);
  }
  return Promise.all(ids.map(fetchJsonByPublicId));
}

function readDeliveryCookie(req) {
  const match = req.headers.cookie?.match(/haibo_cms_delivery=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchLatestFromAdminApi() {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!key || !secret) return null;

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const listRes = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/resources/raw/upload?prefix=haibo/cms/m-&max_results=30&direction=desc`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!listRes.ok) return null;

  const list = await listRes.json();
  const latest = list.resources?.[0]?.public_id;
  if (!latest) return null;
  return fetchJsonByPublicId(latest);
}

async function signedUpload(payload, publicId) {
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!key || !secret) return null;

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = `overwrite=true&public_id=${publicId}&timestamp=${timestamp}${secret}`;
  const signature = createHash('sha1').update(paramsToSign).digest('hex');

  const form = new FormData();
  form.append('file', new Blob([JSON.stringify(payload)], { type: 'application/json' }), 'site-cms.json');
  form.append('api_key', key);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/raw/upload`, {
    method: 'POST',
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error?.message || 'Cloudinary signed upload failed');
  }
  return body;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const cookieUrl = readDeliveryCookie(req);
    const [cookieDoc, apiLatest, manifest, slotDocs] = await Promise.all([
      cookieUrl ? fetchJsonUrl(cookieUrl) : null,
      fetchLatestFromAdminApi(),
      fetchJsonByPublicId(MANIFEST_ID),
      fetchRecentMinuteSlots(),
    ]);
    const best = pickNewest([cookieDoc, apiLatest, manifest, ...(slotDocs || [])]);
    if (!best) {
      return res.status(404).json({ error: 'No CMS content found' });
    }
    return res.status(200).json(best);
  }

  if (req.method === 'POST') {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const doc = {
        ...payload,
        version: 1,
        updatedAt: Date.now(),
      };

      if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        const minuteSlot = Math.floor(Date.now() / 60000) % MINUTES_PER_DAY;
        const backup = await signedUpload(doc, `haibo/cms/m-${Date.now()}`);
        await signedUpload(doc, `haibo/cms/v-${minuteSlot}`);
        await signedUpload(doc, MANIFEST_ID);
        const latestUrl = backup?.secure_url || deliveryUrl(MANIFEST_ID);
        return res.status(200).json({ ...doc, _deliveryUrl: latestUrl });
      }

      return res.status(501).json({
        error: 'Add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on Vercel for instant sync on all devices.',
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Upload failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
