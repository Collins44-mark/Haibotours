/**
 * GET /sitemap.xml (rewritten here by vercel.json)
 * Static public pages + every published destination from the Firestore CMS.
 * Uses Firestore's public REST read (same data the website shows); no secrets required.
 * Visibility rules mirror frontend/js/haibo-live-content.mjs + content-store.mjs.
 */
const SITE_URL = 'https://haiboafricatours.co.tz';
const FIRESTORE_DOCS =
  'https://firestore.googleapis.com/v1/projects/haibo-tours/databases/(default)/documents';

const STATIC_PATHS = ['/', '/destinations.html', '/gallery.html', '/contact.html'];

function normalizeId(id) {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function fieldValue(field) {
  if (!field || typeof field !== 'object') return undefined;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(fieldValue);
  return undefined;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(value) {
  if (value == null || value === '') return null;
  const d = new Date(typeof value === 'number' ? value : String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Firestore ${res.status} for ${url}`);
  return res.json();
}

async function fetchDeletedIds() {
  try {
    const doc = await fetchJson(
      `${FIRESTORE_DOCS}/settings/main?mask.fieldPaths=deletedDestinationIds`
    );
    const list = fieldValue(doc.fields?.deletedDestinationIds) || [];
    return new Set(list.map(normalizeId).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function fetchPublishedDestinations() {
  const mask = ['id', 'name', 'active', 'status', 'updatedAt']
    .map((f) => `mask.fieldPaths=${f}`)
    .join('&');
  const docs = [];
  let pageToken = '';
  do {
    const url = `${FIRESTORE_DOCS}/destinations?pageSize=300&${mask}${
      pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
    }`;
    const page = await fetchJson(url);
    docs.push(...(page.documents || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken);

  const deleted = await fetchDeletedIds();
  const seen = new Set();
  const out = [];

  for (const doc of docs) {
    const f = doc.fields || {};
    const docId = String(doc.name || '').split('/').pop();
    const id = normalizeId(fieldValue(f.id) || docId);
    const active = fieldValue(f.active);
    const status = fieldValue(f.status);
    if (!id || seen.has(id) || deleted.has(id)) continue;
    if (active === false || status === 'draft' || status === 'archived') continue;
    seen.add(id);
    out.push({
      loc: `${SITE_URL}/destinations/${encodeURIComponent(id)}`,
      lastmod: toIsoDate(fieldValue(f.updatedAt)) || toIsoDate(doc.updateTime),
    });
  }
  return out;
}

function buildXml(entries) {
  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escapeXml(e.loc)}</loc>${
          e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''
        }\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function handler(req, res) {
  const staticEntries = STATIC_PATHS.map((p) => ({ loc: `${SITE_URL}${p}` }));
  let destinations = [];
  let ok = true;
  try {
    destinations = await fetchPublishedDestinations();
  } catch (err) {
    ok = false;
    console.error('[sitemap] destination fetch failed:', err?.message || err);
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader(
    'Cache-Control',
    ok ? 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' : 'no-store'
  );
  res.statusCode = 200;
  res.end(buildXml([...staticEntries, ...destinations]));
}

module.exports = handler;
module.exports.buildXml = buildXml;
module.exports.fetchPublishedDestinations = fetchPublishedDestinations;
