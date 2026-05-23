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

import { uploadSiteCms } from '../frontend/js/cms-cloudinary.mjs';

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

globalThis.CLOUDINARY_CONFIG = {
  cloudName: 'dae3rpnmg',
  uploadPreset: 'ml_default',
  baseFolder: 'haibo',
};

const saved = await uploadSiteCms(manifest);
console.log(
  'OK: Published',
  saved.destinations?.length ?? 0,
  'destinations to site-live (+ backup). updatedAt:',
  saved.updatedAt
);
