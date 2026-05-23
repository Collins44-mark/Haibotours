#!/usr/bin/env node
/**
 * One-time/bootstrap: publish static site destinations to the public Cloudinary CMS manifest.
 * Run: node scripts/seed-public-cms-manifest.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const destPath = join(root, 'frontend/js/destinations-data.js');
const raw = readFileSync(destPath, 'utf8');
const end = raw.indexOf('];\n\n/** Admin seed');
if (end < 0) throw new Error('Could not parse destinations-data.js');
const destinations = new Function(`${raw.slice(0, end + 2)}\nreturn DESTINATIONS;`)();

const cfg = {
  cloudName: 'dae3rpnmg',
  uploadPreset: 'ml_default',
  baseFolder: 'haibo',
};

const manifest = {
  version: 1,
  updatedAt: Date.now(),
  destinations: destinations.map((d, i) => ({
    ...d,
    order: i,
    active: true,
    published: true,
    _fromFirestore: true,
  })),
  hero: {
    eyebrow: 'Explore Tanzania',
    title: 'Discover the soul of',
    titleAccent: 'Tanzania',
    subtitle:
      'Authentic safaris, luxury adventures, cultural journeys and unforgettable wildlife experiences across East Africa.',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2070&auto=format&fit=crop',
    ctaPrimaryText: 'Explore Safaris',
    ctaPrimaryLink: 'destinations.html',
  },
  settings: {
    destinationsSection: { eyebrow: 'Explore Tanzania', title: 'Popular Destinations' },
  },
};

const publicId = `${cfg.baseFolder}/cms/site-manifest`;
const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
const form = new FormData();
form.append('file', blob, 'public-content.json');
form.append('upload_preset', cfg.uploadPreset);
form.append('public_id', publicId);

const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/raw/upload`, {
  method: 'POST',
  body: form,
});
const body = await res.json();
if (!res.ok) {
  console.error('Upload failed:', body.error?.message || body);
  process.exit(1);
}
console.log('OK: Published', destinations.length, 'destinations to', body.secure_url);
