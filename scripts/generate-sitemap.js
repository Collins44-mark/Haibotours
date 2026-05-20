#!/usr/bin/env node
/**
 * Regenerate frontend/sitemap.xml from destinations-data.js
 * Usage: node scripts/generate-sitemap.js [baseUrl]
 */
const fs = require('fs');
const path = require('path');

const base = (process.argv[2] || 'https://haibotours.com').replace(/\/$/, '');
const root = path.join(__dirname, '..', 'frontend');
const dataPath = path.join(root, 'js', 'destinations-data.js');
const src = fs.readFileSync(dataPath, 'utf8');
const ids = [...src.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
const uniqueIds = [...new Set(ids)];

const staticPages = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/destinations.html', priority: '0.9', changefreq: 'weekly' },
  { loc: '/gallery.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/contact.html', priority: '0.8', changefreq: 'monthly' },
];

const urls = [
  ...staticPages,
  ...uniqueIds.map((id) => ({
    loc: `/destinations/${id}`,
    priority: '0.85',
    changefreq: 'weekly',
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${base}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
console.log(`Wrote ${urls.length} URLs to frontend/sitemap.xml`);
