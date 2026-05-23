import { doc } from '../../js/firebase-cdn.mjs';

import {
  dbSetDoc,
  dbGetDoc,
  dbList,
  dbDeleteDoc,
  getDbBatch,
  requireDb,
  adminToast,
  slugify,
  ADMIN_DOC,
} from './admin-db.mjs';

import { signOutAdmin, LOGIN_URL } from './firebase.js';

import { formatAdminError } from './admin-errors.mjs';

import {
  createUploadZone,
  getRecentUploads,
} from './admin-cloudinary.mjs';
import {
  mergeDestinationsForAdmin,
  renderDestinationsList,
  bindDestinationsListFilters,
} from './admin-destinations.mjs';
import { publishPublicCmsManifest } from './admin-cms-publish.mjs';
import { subscribeAdminCollections } from './admin-realtime.mjs';
import { initTopbarMenu, initMobileSidebar } from './admin-ui.mjs';

const FIRESTORE_PATHS = globalThis.FIRESTORE_PATHS;

/** HAIBO Admin — section managers */
let state = {
  destinations: [],
  gallery: [],
  weatherCards: [],
  heroDoc: null,
};

const PANEL_TITLES = {
  dashboard: 'Dashboard',
  hero: 'Hero section',
  destinations: 'Destinations',
  search: 'Safari search',
  about: 'About',
  gallery: 'Gallery',
  contact: 'Contact',
  socials: 'Social links',
  weather: 'Weather',
  settings: 'Settings',
};

function defaults() {
  return typeof HAIBO_DEFAULTS !== 'undefined' ? HAIBO_DEFAULTS : {};
}

function mergeDoc(fallback, remote) {
  if (!remote) return { ...fallback };
  return { ...fallback, ...remote };
}

function showPanel(id) {
  document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('is-active'));
  document.querySelectorAll('.admin-nav__btn').forEach((b) => b.classList.remove('is-active'));
  document.getElementById(`panel-${id}`)?.classList.add('is-active');
  document.querySelector(`[data-panel="${id}"]`)?.classList.add('is-active');
  const title = document.getElementById('admin-page-title');
  if (title) title.textContent = PANEL_TITLES[id] || 'CMS';
}

function countPackages(dests) {
  return dests.reduce((n, d) => n + (Array.isArray(d.packages) ? d.packages.length : 0), 0);
}

/** Built-in catalog from destinations-data.js */
function getStaticDestinations() {
  return (
    window.HAIBO_DESTINATIONS_STATIC ||
    (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS : [])
  );
}

/** Firestore rows merged with static defaults for admin editing */
function getAdminDestinationsForUi() {
  const staticList = getStaticDestinations();
  const fromDb = state.destinations;
  if (!fromDb.length) {
    return staticList.map((d, i) => ({ ...d, order: i, _source: 'static' }));
  }
  const byId = new Map(fromDb.map((d) => [d.id, { ...d, _source: 'firestore' }]));
  staticList.forEach((d, i) => {
    if (!byId.has(d.id)) {
      byId.set(d.id, { ...d, order: 500 + i, _source: 'static' });
    }
  });
  return [...byId.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getAdminDestinationById(id) {
  if (!id) return null;
  const fromDb = state.destinations.find((x) => x.id === id);
  if (fromDb) return fromDb;
  return getStaticDestinations().find((x) => x.id === id) || null;
}

function showDestinationsImportBanner() {
  const panel = document.getElementById('panel-destinations');
  if (!panel) return;
  let banner = document.getElementById('dest-import-banner');
  if (state.destinations.length > 0) {
    banner?.remove();
    return;
  }
  if (banner) return;
  banner = document.createElement('div');
  banner.id = 'dest-import-banner';
  banner.className = 'admin-glass admin-import-banner';
  banner.innerHTML = `
    <h2>Website content ready to import</h2>
    <p class="admin-muted">All ${getStaticDestinations().length} destinations, packages, and gallery data from the live site are listed below. Click <strong>Import website defaults</strong> to copy them into Firestore, or open any destination, edit, and save to publish changes to the website.</p>
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem">
      <button type="button" class="admin-btn admin-btn--primary admin-btn--sm" id="btn-seed-inline">Import all defaults to Firestore</button>
    </div>
  `;
  panel.insertBefore(banner, panel.firstChild);
  banner.querySelector('#btn-seed-inline')?.addEventListener('click', () => seedAllDefaults());
}

async function renderDashboard() {
  const dests = getAdminDestinationsForUi();
  const hero = state.heroDoc || (await dbGetDoc(FIRESTORE_PATHS.hero));
  const hasHero = Boolean(hero?.backgroundImageUrl);
  const pkgCount = countPackages(dests);

  const statsEl = document.getElementById('dashboard-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <article class="admin-stat-card">
        <div class="admin-stat-card__icon">📍</div>
        <div class="admin-stat-card__value">${dests.length}</div>
        <div class="admin-stat-card__label">Destinations</div>
        <div class="admin-stat-card__meta">${state.destinations.length ? 'From Firestore' : 'Showing site defaults'}</div>
      </article>
      <article class="admin-stat-card">
        <div class="admin-stat-card__icon">📦</div>
        <div class="admin-stat-card__value">${pkgCount}</div>
        <div class="admin-stat-card__label">Safari packages</div>
        <div class="admin-stat-card__meta">Across all destinations</div>
      </article>
      <article class="admin-stat-card">
        <div class="admin-stat-card__icon">🖼</div>
        <div class="admin-stat-card__value">${hasHero ? 'Live' : 'Default'}</div>
        <div class="admin-stat-card__label">Hero media</div>
        <div class="admin-stat-card__meta">${hasHero ? 'Custom background set' : 'Using built-in hero image'}</div>
      </article>
      <article class="admin-stat-card">
        <div class="admin-stat-card__icon">☁</div>
        <div class="admin-stat-card__value">${state.gallery.length}</div>
        <div class="admin-stat-card__label">Gallery items</div>
        <div class="admin-stat-card__meta">${state.gallery.length ? 'In Firestore' : 'Defaults on public site'}</div>
      </article>
    `;
  }
  renderRecentUploads();
}

function renderRecentUploads() {
  const list = document.getElementById('recent-uploads-list');
  if (!list) return;
  const items = getRecentUploads();
  if (!items.length) {
    list.innerHTML =
      '<li class="admin-muted">Upload images in Hero, About, or Destinations to see them here.</li>';
    return;
  }
  list.innerHTML = items
    .map(
      (u) => `
    <li>
      <img src="${u.url}" alt="" width="40" height="40" />
      <div>
        <strong>${u.folder || 'upload'}</strong><br />
        <span class="admin-muted">${new Date(u.at).toLocaleString()}</span>
      </div>
    </li>`
    )
    .join('');
}

export async function seedAllDefaults() {
  if (!confirm('Import website defaults into Firestore? This merges data.')) return;

  try {
  await dbSetDoc(FIRESTORE_PATHS.hero, {
    eyebrow: 'Explore Tanzania',
    title: 'Discover the soul of',
    titleAccent: 'Tanzania',
    subtitle:
      'Authentic safaris, luxury adventures, cultural journeys and unforgettable wildlife experiences across East Africa.',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2070&auto=format&fit=crop',
    ctaPrimaryText: 'Explore Safaris',
    ctaPrimaryLink: 'destinations.html',
    ctaSecondaryText: 'View Gallery',
    ctaSecondaryLink: 'gallery.html',
    homeCta: {
      eyebrow: 'Start Your Journey',
      title: 'Start Your Tanzania Adventure',
      body: "Ready to explore? Contact us today and we'll craft the perfect safari itinerary for you.",
      backgroundClass: 'cta-bg-kili',
    },
    updatedAt: Date.now(),
  });

  await dbSetDoc(FIRESTORE_PATHS.about, {
    eyebrow: 'Why Choose Us',
    title: 'Unforgettable Journeys Crafted For You',
    body: 'Experience premium safari adventures with expert local guides, luxury accommodations, and unforgettable wildlife encounters.',
    imageUrl:
      'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1974&auto=format&fit=crop',
    featureCards: [
      { title: 'SUSTAINABLE TRAVEL', subtitle: '' },
      { title: 'Best price guarantee', subtitle: '' },
      { title: 'Local expertise', subtitle: '' },
      { title: '24/7', subtitle: 'Guest Support' },
    ],
    updatedAt: Date.now(),
  });

  await dbSetDoc(FIRESTORE_PATHS.contact, {
    phoneDisplay: HAIBO_CONFIG.phoneDisplay,
    email: HAIBO_CONFIG.email,
    whatsappNumber: HAIBO_CONFIG.whatsappNumber,
    address: HAIBO_CONFIG.address,
    officeHours: HAIBO_CONFIG.officeHours,
    mapUrl: HAIBO_CONFIG.mapUrl,
    defaultTourMessage: HAIBO_CONFIG.defaultTourMessage,
    updatedAt: Date.now(),
  });

  await dbSetDoc(FIRESTORE_PATHS.socials, {
    instagram: HAIBO_CONFIG.social.instagram,
    facebook: HAIBO_CONFIG.social.facebook,
    tiktok: '',
    whatsapp: '',
    updatedAt: Date.now(),
  });

  await dbSetDoc(FIRESTORE_PATHS.settings, {
    logoUrl: HAIBO_CONFIG.logoPath,
    brandName: 'HAIBO',
    tagline: 'TOURS & SAFARIS',
    searchEnabledIds: DESTINATIONS.map((d) => d.id),
    destinationsSection: { eyebrow: 'Explore Tanzania', title: 'Popular Destinations' },
    gallerySection: { eyebrow: 'Gallery', title: 'Experience Tanzania' },
    footer: {
      brand: 'HAIBO',
      description:
        'Luxury safari experiences crafted for explorers seeking unforgettable adventures in Tanzania.',
      copyright: '© 2026 HAIBO Tours & Safaris',
      quickLinks: [
        { label: 'About Us', href: '#about' },
        { label: 'Destinations', href: 'destinations.html' },
        { label: 'Gallery', href: 'gallery.html' },
        { label: 'Safaris', href: '#safaris' },
        { label: 'Contact', href: 'contact.html' },
      ],
    },
    navLinks: [
      { label: 'Home', href: '#home' },
      { label: 'About', href: '#about' },
      { label: 'Safaris', href: '#safaris' },
      { label: 'Destinations', href: 'destinations.html' },
      { label: 'Gallery', href: 'gallery.html' },
      { label: 'Contact', href: 'contact.html' },
    ],
    updatedAt: Date.now(),
  });

  const db = requireDb();
  const batch = getDbBatch();
  DESTINATIONS.forEach((d, i) => {
    const row = { ...d, order: i, active: true, updatedAt: Date.now() };
    if (row.galleryImages?.length && !row.gallery?.length) {
      row.gallery = row.galleryImages;
    }
    delete row.galleryImages;
    batch.set(doc(db, FIRESTORE_PATHS.destinations, d.id), row, { merge: true });
  });
  await batch.commit();

  const gBatch = getDbBatch();
  (typeof GALLERY_IMAGES !== 'undefined' ? GALLERY_IMAGES : []).forEach((img, i) => {
    const id = `img-${i}`;
    gBatch.set(doc(db, FIRESTORE_PATHS.gallery, id), {
      type: 'image',
      order: i,
      src: img.src,
      title: img.title,
      tag: img.tag,
      active: true,
      updatedAt: Date.now(),
    });
  });
  (typeof GALLERY_VIDEOS !== 'undefined' ? GALLERY_VIDEOS : []).forEach((vid, i) => {
    const id = `vid-${i}`;
    gBatch.set(doc(db, FIRESTORE_PATHS.gallery, id), {
      type: 'video',
      order: i + 100,
      src: vid.src,
      thumb: vid.thumb,
      title: vid.title,
      tag: vid.tag,
      active: true,
      updatedAt: Date.now(),
    });
  });
  await gBatch.commit();

  const parks =
    typeof WEATHER_PARKS_STATIC !== 'undefined'
      ? WEATHER_PARKS_STATIC
      : typeof WEATHER_PARKS !== 'undefined'
        ? WEATHER_PARKS
        : [];
  if (parks.length) {
    const wBatch = getDbBatch();
    parks.forEach((w, i) => {
      wBatch.set(
        doc(db, FIRESTORE_PATHS.weatherCards, w.id),
        { ...w, order: i, active: true, updatedAt: Date.now() },
        { merge: true }
      );
    });
    await wBatch.commit();
  }

  adminToast('Defaults imported to Firestore', 'success');
  await loadAllAdminData();
  showDestinationsImportBanner();
  await publishPublicCmsManifest({ silent: true }).catch((err) => {
    console.warn('[HAIBO] Public manifest publish after import failed', err?.message || err);
  });
  } catch (err) {
    adminToast(err.message || formatAdminError(err, 'Import'), 'error');
  }
}

async function loadAllAdminData() {
  state.destinations = await dbList(FIRESTORE_PATHS.destinations);
  state.gallery = await dbList(FIRESTORE_PATHS.gallery);
  state.weatherCards = await dbList(FIRESTORE_PATHS.weatherCards);
  state.heroDoc = await dbGetDoc(FIRESTORE_PATHS.hero);
  refreshDestinationsListUi();
  showDestinationsImportBanner();
  renderGalleryList();
  renderWeatherList();
  renderSearchDestCheckboxes();
  renderDashboard();
}

async function loadHeroForm() {
  const raw = await dbGetDoc(FIRESTORE_PATHS.hero);
  state.heroDoc = raw;
  const d = mergeDoc(defaults().hero || {}, raw);
  const f = document.getElementById('form-hero');
  if (!f) return;
  f.eyebrow.value = d.eyebrow || '';
  f.title.value = d.title || '';
  f.titleAccent.value = d.titleAccent || '';
  f.subtitle.value = d.subtitle || '';
  f.backgroundImageUrl.value = d.backgroundImageUrl || '';
  f.ctaPrimaryText.value = d.ctaPrimaryText || '';
  f.ctaPrimaryLink.value = d.ctaPrimaryLink || '';
  f.ctaSecondaryText.value = d.ctaSecondaryText || '';
  f.ctaSecondaryLink.value = d.ctaSecondaryLink || '';
  const prev = document.getElementById('hero-preview');
  if (prev && d.backgroundImageUrl) {
    prev.src = d.backgroundImageUrl;
    prev.classList.remove('hidden');
  }
}

async function saveHeroForm(e) {
  e.preventDefault();
  const f = e.target;
  await dbSetDoc(FIRESTORE_PATHS.hero, {
    eyebrow: f.eyebrow.value,
    title: f.title.value,
    titleAccent: f.titleAccent.value,
    subtitle: f.subtitle.value,
    backgroundImageUrl: f.backgroundImageUrl.value,
    ctaPrimaryText: f.ctaPrimaryText.value,
    ctaPrimaryLink: f.ctaPrimaryLink.value,
    ctaSecondaryText: f.ctaSecondaryText.value,
    ctaSecondaryLink: f.ctaSecondaryLink.value,
  });
  adminToast('Hero saved', 'success');
  await loadHeroForm();
}

async function loadAboutForm() {
  const d = mergeDoc(defaults().about || {}, await dbGetDoc(FIRESTORE_PATHS.about));
  const f = document.getElementById('form-about');
  if (!f) return;
  f.eyebrow.value = d.eyebrow || '';
  f.title.value = d.title || '';
  f.body.value = d.body || '';
  f.imageUrl.value = d.imageUrl || '';
  (d.featureCards || []).forEach((c, i) => {
    if (f[`featureTitle${i}`]) f[`featureTitle${i}`].value = c.title || '';
    if (f[`featureSub${i}`]) f[`featureSub${i}`].value = c.subtitle || '';
  });
}

async function saveAboutForm(e) {
  e.preventDefault();
  const f = e.target;
  const featureCards = [0, 1, 2, 3].map((i) => ({
    title: f[`featureTitle${i}`]?.value || '',
    subtitle: f[`featureSub${i}`]?.value || '',
  }));
  await dbSetDoc(FIRESTORE_PATHS.about, {
    eyebrow: f.eyebrow.value,
    title: f.title.value,
    body: f.body.value,
    imageUrl: f.imageUrl.value,
    featureCards,
  });
  adminToast('About section saved', 'success');
}

async function loadContactForm() {
  const base = { ...HAIBO_CONFIG, ...(defaults().contact || {}) };
  const d = mergeDoc(base, await dbGetDoc(FIRESTORE_PATHS.contact));
  const f = document.getElementById('form-contact');
  if (!f) return;
  Object.keys(d).forEach((k) => {
    if (f[k]) f[k].value = d[k];
  });
}

async function saveContactForm(e) {
  e.preventDefault();
  const f = e.target;
  await dbSetDoc(FIRESTORE_PATHS.contact, {
    phoneDisplay: f.phoneDisplay.value,
    whatsappNumber: f.whatsappNumber.value,
    email: f.email.value,
    mapUrl: f.mapUrl.value,
    address: f.address.value,
    officeHours: f.officeHours.value,
    defaultTourMessage: f.defaultTourMessage.value,
  });
  adminToast('Contact saved', 'success');
}

async function loadSocialsForm() {
  const d = mergeDoc(defaults().socials || {}, await dbGetDoc(FIRESTORE_PATHS.socials));
  const f = document.getElementById('form-socials');
  if (!f) return;
  ['instagram', 'facebook', 'tiktok', 'whatsapp'].forEach((k) => {
    if (f[k]) f[k].value = d[k] || '';
  });
}

async function saveSocialsForm(e) {
  e.preventDefault();
  const f = e.target;
  await dbSetDoc(FIRESTORE_PATHS.socials, Object.fromEntries(new FormData(f)));
  adminToast('Social links saved', 'success');
}

async function loadSettingsForm() {
  const d = mergeDoc(defaults().settings || {}, await dbGetDoc(FIRESTORE_PATHS.settings));
  const f = document.getElementById('form-settings');
  if (!f) return;
  if (f.logoUrl) f.logoUrl.value = d.logoUrl || '';
  if (f.brandName) f.brandName.value = d.brandName || '';
  if (f.tagline) f.tagline.value = d.tagline || '';
  if (f.footerDescription) f.footerDescription.value = d.footer?.description || '';
  if (f.footerCopyright) f.footerCopyright.value = d.footer?.copyright || '';
  if (f.navLinksJson) f.navLinksJson.value = JSON.stringify(d.navLinks || [], null, 2);
}

async function saveSettingsForm(e) {
  e.preventDefault();
  const f = e.target;
  let navLinks = [];
  try {
    navLinks = JSON.parse(f.navLinksJson.value || '[]');
  } catch {
    adminToast('Invalid navbar JSON', 'error');
    return;
  }
  const existing = (await dbGetDoc(FIRESTORE_PATHS.settings)) || {};
  await dbSetDoc(FIRESTORE_PATHS.settings, {
    ...existing,
    logoUrl: f.logoUrl.value,
    brandName: f.brandName.value,
    tagline: f.tagline.value,
    footer: {
      ...(existing.footer || {}),
      brand: f.brandName.value,
      description: f.footerDescription.value,
      copyright: f.footerCopyright.value,
      quickLinks: existing.footer?.quickLinks || [],
    },
    navLinks,
  });
  adminToast('Settings saved', 'success');
}

function refreshDestinationsListUi() {
  const el = document.getElementById('destinations-list');
  const panel = document.querySelector('.admin-dest-panel');
  if (!el) return;
  const list = mergeDestinationsForAdmin(state.destinations);
  renderDestinationsList(el, list, { onRefresh: () => loadAllAdminData() });

  const regionSelect = panel?.querySelector('[data-dest-filter-region]');
  if (regionSelect && regionSelect.options.length <= 1) {
    const regions = [...new Set(list.map((d) => d.region).filter(Boolean))].sort();
    regions.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      regionSelect.appendChild(opt);
    });
  }
}

function openDestinationsPanelFromHash() {
  if (window.location.hash === '#destinations') {
    window.location.href = '/admin/destinations/index.html';
  }
}

function renderGalleryList() {
  const el = document.getElementById('gallery-list');
  if (!el) return;
  el.innerHTML = state.gallery
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(
      (g) => `
    <div class="admin-card-item">
      <img src="${g.thumb || g.src}" alt="" class="admin-thumb" />
      <div class="admin-card-item__body">
        <strong>${g.title || 'Untitled'}</strong>
        <span class="admin-muted">${g.type} · ${g.tag || ''}</span>
      </div>
      <button type="button" class="admin-btn admin-btn--danger" data-del-gallery="${g.id}">Delete</button>
    </div>`
    )
    .join('');

  el.querySelectorAll('[data-del-gallery]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete gallery item?')) return;
      await dbDeleteDoc(FIRESTORE_PATHS.gallery, btn.dataset.delGallery);
      adminToast('Deleted', 'success');
      await loadAllAdminData();
    });
  });
}

async function addGalleryImage(e) {
  e.preventDefault();
  const f = e.target;
  await dbSetDoc(
    FIRESTORE_PATHS.gallery,
    {
      type: f.type.value,
      src: f.src.value,
      thumb: f.thumb.value || f.src.value,
      title: f.title.value,
      tag: f.tag.value,
      order: Number(f.order.value) || 0,
      active: true,
    },
    `g-${Date.now()}`
  );
  f.reset();
  adminToast('Gallery item added', 'success');
  await loadAllAdminData();
}

function renderWeatherList() {
  const el = document.getElementById('weather-list');
  if (!el) return;
  el.innerHTML = state.weatherCards
    .map(
      (w) => `
    <div class="admin-card-item">
      <div class="admin-card-item__body">
        <strong>${w.shortName || w.name}</strong>
        <span class="admin-muted">${w.id} · ${w.lat}, ${w.lon}</span>
      </div>
      <button type="button" class="admin-btn admin-btn--ghost" data-edit-weather="${w.id}">Edit</button>
      <button type="button" class="admin-btn admin-btn--danger" data-del-weather="${w.id}">Delete</button>
    </div>`
    )
    .join('');

  el.querySelectorAll('[data-edit-weather]').forEach((btn) => {
    btn.addEventListener('click', () => openWeatherEditor(btn.dataset.editWeather));
  });
  el.querySelectorAll('[data-del-weather]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete weather card?')) return;
      await dbDeleteDoc(FIRESTORE_PATHS.weatherCards, btn.dataset.delWeather);
      await loadAllAdminData();
      adminToast('Deleted', 'success');
    });
  });
}

function openWeatherEditor(id) {
  const w = state.weatherCards.find((x) => x.id === id) || {
    id: '',
    name: '',
    shortName: '',
    lat: 0,
    lon: 0,
    facts: [],
    imageUrl: '',
    displayTemp: '',
    displayLabel: '',
    active: true,
  };
  const f = document.getElementById('form-weather');
  f.dataset.editId = w.id;
  f.id.value = w.id;
  f.id.disabled = Boolean(id);
  f.name.value = w.name || '';
  f.shortName.value = w.shortName || '';
  f.lat.value = w.lat ?? '';
  f.lon.value = w.lon ?? '';
  f.facts.value = (w.facts || []).join('\n');
  f.imageUrl.value = w.imageUrl || '';
  f.displayTemp.value = w.displayTemp || '';
  f.displayLabel.value = w.displayLabel || '';
  f.active.checked = w.active !== false;
  showPanel('weather');
}

async function saveWeatherForm(e) {
  e.preventDefault();
  const f = e.target;
  const id = (f.dataset.editId || slugify(f.shortName.value || f.name.value)).trim();
  await dbSetDoc(
    FIRESTORE_PATHS.weatherCards,
    {
      id,
      name: f.name.value,
      shortName: f.shortName.value,
      lat: Number(f.lat.value),
      lon: Number(f.lon.value),
      facts: f.facts.value.split('\n').map((s) => s.trim()).filter(Boolean),
      imageUrl: f.imageUrl.value,
      displayTemp: f.displayTemp.value,
      displayLabel: f.displayLabel.value,
      active: f.active.checked,
    },
    id
  );
  adminToast('Weather card saved', 'success');
  await loadAllAdminData();
}

function renderSearchDestCheckboxes() {
  const el = document.getElementById('search-dest-checkboxes');
  if (!el) return;
  const settings = state.settingsCache || {};
  dbGetDoc(FIRESTORE_PATHS.settings).then((s) => {
    state.settingsCache = s || {};
    const enabled = new Set(s?.searchEnabledIds || getAdminDestinationsForUi().map((d) => d.id));
    const sorted = getAdminDestinationsForUi();
    el.innerHTML = sorted
      .map(
        (d) => `
      <label class="admin-check">
        <input type="checkbox" name="searchDest" value="${d.id}" ${enabled.has(d.id) ? 'checked' : ''} />
        ${d.name}
      </label>`
      )
      .join('');
  });
}

async function saveSearchSettings() {
  const checked = [...document.querySelectorAll('#search-dest-checkboxes input:checked')].map(
    (i) => i.value
  );
  const existing = (await dbGetDoc(FIRESTORE_PATHS.settings)) || {};
  await dbSetDoc(FIRESTORE_PATHS.settings, {
    ...existing,
    searchEnabledIds: checked,
  });
  adminToast('Search destinations updated', 'success');
}

function initAdminAppHandlers() {
  initMobileSidebar();
  initTopbarMenu();
  openDestinationsPanelFromHash();
  window.addEventListener('hashchange', openDestinationsPanelFromHash);

  const destPanel = document.querySelector('.admin-dest-panel');
  bindDestinationsListFilters(destPanel, refreshDestinationsListUi);

  subscribeAdminCollections({
    onDestinations: (items) => {
      state.destinations = items;
      refreshDestinationsListUi();
      renderDashboardStats();
    },
    onGallery: (items) => {
      state.gallery = items;
      renderGalleryList();
    },
    onWeather: (items) => {
      state.weatherCards = items;
      renderWeatherList();
    },
  });

  window.addEventListener('haiboAdminUpload', () => renderRecentUploads());

  document.querySelectorAll('.admin-nav__btn[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.panel === 'destinations') {
        window.location.href = '/admin/destinations/index.html';
        return;
      }
      showPanel(btn.dataset.panel);
    });
  });
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => showPanel(btn.dataset.goto));
  });

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    try {
      await signOutAdmin();
      window.location.replace(LOGIN_URL);
    } catch (err) {
      adminToast(formatAdminError(err, 'Logout'), 'error');
    }
  });
  document.getElementById('btn-seed')?.addEventListener('click', () => seedAllDefaults());
  document.getElementById('btn-publish-website')?.addEventListener('click', () =>
    publishPublicCmsManifest()
  );

  document.getElementById('form-hero')?.addEventListener('submit', saveHeroForm);
  document.getElementById('form-about')?.addEventListener('submit', saveAboutForm);
  document.getElementById('form-contact')?.addEventListener('submit', saveContactForm);
  document.getElementById('form-socials')?.addEventListener('submit', saveSocialsForm);
  document.getElementById('form-settings')?.addEventListener('submit', saveSettingsForm);
  document.getElementById('form-gallery-add')?.addEventListener('submit', addGalleryImage);
  document.getElementById('form-weather')?.addEventListener('submit', saveWeatherForm);
  document.getElementById('btn-save-search')?.addEventListener('click', saveSearchSettings);
  document.getElementById('btn-new-weather')?.addEventListener('click', () => openWeatherEditor(''));

  const bindZone = (inputId, previewId, folder, onUrl) => {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const progress = input?.closest('.admin-upload-zone')?.querySelector('.admin-upload-progress');
    createUploadZone(input, { previewEl: preview, progressEl: progress, folder, onUrl });
  };

  bindZone('hero-upload', 'hero-preview', 'hero', (url) => {
    document.querySelector('#form-hero [name="backgroundImageUrl"]').value = url;
  });
  bindZone('about-upload', 'about-preview', 'about', (url) => {
    document.querySelector('#form-about [name="imageUrl"]').value = url;
  });
  bindZone('logo-upload', 'logo-preview', 'settings', (url) => {
    document.querySelector('#form-settings [name="logoUrl"]').value = url;
  });
  bindZone('gallery-upload', 'gallery-upload-preview', 'gallery', (url) => {
    const src = document.querySelector('#form-gallery-add [name="src"]');
    if (src) src.value = url;
  });

  loadHeroForm();
  loadAboutForm();
  loadContactForm();
  loadSocialsForm();
  loadSettingsForm();
  loadAllAdminData();
}

let adminAppInitialized = false;

export function initAdminApp() {
  if (adminAppInitialized) {
    console.log('[HAIBO Admin] initAdminApp skipped (already initialized)');
    return;
  }
  adminAppInitialized = true;
  initAdminAppHandlers();
}
