import { adminToast, slugify } from './admin-db.mjs';
import { signOutAdmin, LOGIN_URL } from './firebase.js';
import { formatAdminError } from './admin-errors.mjs';
import {
  createUploadZone,
  getRecentUploads,
  cloudinaryUpload,
  cloudinaryVideoPosterUrl,
} from './admin-cloudinary.mjs';
import {
  mergeDestinationsForAdmin,
  renderDestinationsList,
  bindDestinationsListFilters,
} from './admin-destinations.mjs';
import {
  getAdminCms,
  loadAdminCms,
  syncCmsToWebsite,
  saveSectionToFirestore,
  saveGalleryItemToFirestore,
  saveWeatherCardToFirestore,
  deleteGalleryFromFirestore,
  deleteWeatherFromFirestore,
} from './admin-cms.mjs';
import { subscribeAdminFirestore } from './admin-realtime.mjs';
import { initTopbarMenu, initMobileSidebar } from './admin-ui.mjs';
import { initPageHeroesPanel, loadPageHeroesPanel } from './admin-page-heroes.mjs';
import { defaultPageHeroPages, heroFirestorePayloadFromPageHeroes } from '../../js/page-heroes.mjs';

/** HAIBO Admin — section managers */
let state = {
  destinations: [],
  gallery: [],
  weatherCards: [],
  heroDoc: null,
};

const PANEL_TITLES = {
  dashboard: 'Dashboard',
  'page-heroes': 'Page heroes',
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
  if (id === 'page-heroes') loadPageHeroesPanel();
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

function getAdminDestinationsForUi() {
  return mergeDestinationsForAdmin();
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
    <p class="admin-muted">Click <strong>Import website defaults</strong> to load the starter content onto the live site, or add destinations and save — changes go live automatically.</p>
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem">
      <button type="button" class="admin-btn admin-btn--primary admin-btn--sm" id="btn-seed-inline">Import website defaults</button>
    </div>
  `;
  panel.insertBefore(banner, panel.firstChild);
  banner.querySelector('#btn-seed-inline')?.addEventListener('click', () => seedAllDefaults());
}

async function renderDashboard() {
  const dests = getAdminDestinationsForUi();
  const hero = state.heroDoc || getAdminCms().hero;
  const hasHero = Boolean(hero?.backgroundImageUrl);
  const pkgCount = countPackages(dests);

  const statsEl = document.getElementById('dashboard-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <article class="admin-stat-card">
        <div class="admin-stat-card__icon">📍</div>
        <div class="admin-stat-card__value">${dests.length}</div>
        <div class="admin-stat-card__label">Destinations</div>
        <div class="admin-stat-card__meta">On live website</div>
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
        <div class="admin-stat-card__meta">${hasHero ? 'Page hero images configured' : 'Set heroes in Page heroes'}</div>
      </article>
      <article class="admin-stat-card">
        <div class="admin-stat-card__icon">☁</div>
        <div class="admin-stat-card__value">${state.gallery.length}</div>
        <div class="admin-stat-card__label">Gallery items</div>
        <div class="admin-stat-card__meta">On live website</div>
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
  if (!confirm('Load default website content onto the live site?')) return;

  try {
    const cms = getAdminCms();
    const destList = getStaticDestinations();

    const pageHeroDefaults = defaultPageHeroPages();
    cms.pageHeroes = { pages: pageHeroDefaults, updatedAt: Date.now() };
    cms.hero = heroFirestorePayloadFromPageHeroes(cms.pageHeroes);

    cms.about = {
      eyebrow: 'Why Choose Us',
      title: 'Unforgettable Journeys Crafted For You',
      body: 'Experience premium safari adventures with expert local guides, luxury accommodations, and unforgettable wildlife encounters.',
      imageUrl: '',
      featureCards: [
        { title: 'SUSTAINABLE TRAVEL', subtitle: '' },
        { title: 'Best price guarantee', subtitle: '' },
        { title: 'Local expertise', subtitle: '' },
        { title: '24/7', subtitle: 'Guest Support' },
      ],
    };

    cms.contact = {
      phoneDisplay: HAIBO_CONFIG.phoneDisplay,
      email: HAIBO_CONFIG.email,
      whatsappNumber: HAIBO_CONFIG.whatsappNumber,
      address: HAIBO_CONFIG.address,
      officeHours: HAIBO_CONFIG.officeHours,
      mapUrl: HAIBO_CONFIG.mapUrl,
      defaultTourMessage: HAIBO_CONFIG.defaultTourMessage,
    };

    cms.socials = {
      instagram: HAIBO_CONFIG.social.instagram,
      facebook: HAIBO_CONFIG.social.facebook,
      tiktok: '',
      whatsapp: '',
    };

    cms.settings = {
      logoUrl: HAIBO_CONFIG.logoPath,
      brandName: 'HAIBO',
      tagline: 'TOURS & SAFARIS',
      searchEnabledIds: destList.map((d) => d.id),
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
    };

    cms.destinations = destList.map((d, i) => {
      const row = { ...d, order: i, active: true, updatedAt: Date.now() };
      if (row.galleryImages?.length && !row.gallery?.length) {
        row.gallery = row.galleryImages;
      }
      delete row.galleryImages;
      return row;
    });

    cms.gallery = [];
    (typeof GALLERY_IMAGES !== 'undefined' ? GALLERY_IMAGES : []).forEach((img, i) => {
      cms.gallery.push({
        id: `img-${i}`,
        type: 'image',
        order: i,
        src: img.src,
        title: img.title,
        tag: img.tag,
        active: true,
      });
    });
    (typeof GALLERY_VIDEOS !== 'undefined' ? GALLERY_VIDEOS : []).forEach((vid, i) => {
      cms.gallery.push({
        id: `vid-${i}`,
        type: 'video',
        order: i + 100,
        src: vid.src,
        thumb: vid.thumb,
        title: vid.title,
        tag: vid.tag,
        active: true,
      });
    });

    const parks =
      typeof WEATHER_PARKS_STATIC !== 'undefined'
        ? WEATHER_PARKS_STATIC
        : typeof WEATHER_PARKS !== 'undefined'
          ? WEATHER_PARKS
          : [];
    cms.weatherCards = parks.map((w, i) => ({ ...w, order: i, active: true }));

    await syncCmsToWebsite();
    await loadAllAdminData();
    showDestinationsImportBanner();
  } catch (err) {
    adminToast(err.message || formatAdminError(err, 'Import'), 'error');
  }
}

async function loadAllAdminData() {
  await loadAdminCms();
  const cms = getAdminCms();
  state.destinations = cms.destinations || [];
  state.gallery = cms.gallery || [];
  state.weatherCards = cms.weatherCards || [];
  state.heroDoc = cms.hero;
  state.settingsCache = cms.settings;
  refreshDestinationsListUi();
  showDestinationsImportBanner();
  renderGalleryList();
  renderWeatherList();
  renderSearchDestCheckboxes();
  renderDashboard();
}

async function loadAboutForm() {
  const d = mergeDoc(defaults().about || {}, getAdminCms().about);
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
  try {
    const featureCards = [0, 1, 2, 3].map((i) => ({
      title: f[`featureTitle${i}`]?.value || '',
      subtitle: f[`featureSub${i}`]?.value || '',
    }));
    getAdminCms().about = {
      eyebrow: f.eyebrow.value,
      title: f.title.value,
      body: f.body.value,
      imageUrl: f.imageUrl.value,
      featureCards,
    };
    await saveSectionToFirestore('about', getAdminCms().about);
    adminToast('About saved — all devices updated', 'success');
  } catch (err) {
    adminToast(err?.message || 'Could not save about', 'error');
  }
}

async function loadContactForm() {
  const base = { ...HAIBO_CONFIG, ...(defaults().contact || {}) };
  const d = mergeDoc(base, getAdminCms().contact);
  const f = document.getElementById('form-contact');
  if (!f) return;
  Object.keys(d).forEach((k) => {
    if (f[k]) f[k].value = d[k];
  });
}

async function saveContactForm(e) {
  e.preventDefault();
  const f = e.target;
  try {
    getAdminCms().contact = {
      phoneDisplay: f.phoneDisplay.value,
      whatsappNumber: f.whatsappNumber.value,
      email: f.email.value,
      mapUrl: f.mapUrl.value,
      address: f.address.value,
      officeHours: f.officeHours.value,
      defaultTourMessage: f.defaultTourMessage.value,
    };
    await saveSectionToFirestore('contact', getAdminCms().contact);
    adminToast('Contact saved — all devices updated', 'success');
  } catch (err) {
    adminToast(err?.message || 'Could not save contact', 'error');
  }
}

async function loadSocialsForm() {
  const d = mergeDoc(defaults().socials || {}, getAdminCms().socials);
  const f = document.getElementById('form-socials');
  if (!f) return;
  ['instagram', 'facebook', 'tiktok', 'whatsapp'].forEach((k) => {
    if (f[k]) f[k].value = d[k] || '';
  });
}

async function saveSocialsForm(e) {
  e.preventDefault();
  const f = e.target;
  try {
    getAdminCms().socials = Object.fromEntries(new FormData(f));
    await saveSectionToFirestore('socials', getAdminCms().socials);
    adminToast('Social links saved — all devices updated', 'success');
  } catch (err) {
    adminToast(err?.message || 'Could not save social links', 'error');
  }
}

async function loadSettingsForm() {
  const d = mergeDoc(defaults().settings || {}, getAdminCms().settings);
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
  try {
    const cms = getAdminCms();
    cms.settings = {
      ...(cms.settings || {}),
      logoUrl: f.logoUrl.value,
      brandName: f.brandName.value,
      tagline: f.tagline.value,
      footer: {
        ...(cms.settings?.footer || {}),
        brand: f.brandName.value,
        description: f.footerDescription.value,
        copyright: f.footerCopyright.value,
        quickLinks: cms.settings?.footer?.quickLinks || [],
      },
      navLinks,
    };
    await saveSectionToFirestore('settings', cms.settings);
    adminToast('Settings saved — all devices updated', 'success');
  } catch (err) {
    adminToast(err?.message || 'Could not save settings', 'error');
  }
}

function refreshDestinationsListUi() {
  const el = document.getElementById('destinations-list');
  const panel = document.querySelector('.admin-dest-panel');
  if (!el) return;
  const list = mergeDestinationsForAdmin();
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

function setGalleryUploadStatus(text) {
  const el = document.getElementById('gallery-upload-status');
  if (el) el.textContent = text || '';
}

function syncGalleryUploadPanels(type) {
  const isVideo = type === 'video';
  document.querySelectorAll('[data-gallery-upload-panel]').forEach((panel) => {
    const mode = panel.dataset.galleryUploadPanel;
    panel.hidden = isVideo ? mode !== 'video' : mode !== 'image';
  });
}

function resetGalleryForm() {
  const f = document.getElementById('form-gallery-add');
  if (!f) return;
  delete f.dataset.editId;
  f.reset();
  f.src.value = '';
  f.thumb.value = '';
  setGalleryUploadStatus('');
  syncGalleryUploadPanels('image');
  const photoPreview = document.getElementById('gallery-upload-preview');
  const videoPreview = document.getElementById('gallery-video-preview');
  if (photoPreview) {
    photoPreview.hidden = true;
    photoPreview.removeAttribute('src');
  }
  if (videoPreview) {
    videoPreview.hidden = true;
    videoPreview.removeAttribute('src');
  }
  const btn = f.querySelector('[type="submit"]');
  if (btn) btn.textContent = 'Save to gallery';
  const heading = f.querySelector('h2');
  if (heading) heading.textContent = 'Add gallery item';
}

function fillGalleryForm(item) {
  const f = document.getElementById('form-gallery-add');
  if (!f || !item) return;
  f.dataset.editId = item.id;
  const mediaType = item.type || 'image';
  f.type.value = mediaType;
  f.src.value = item.src || '';
  f.thumb.value = item.thumb || item.src || '';
  f.title.value = item.title || '';
  f.tag.value = item.tag || '';
  f.order.value = item.order ?? 0;
  syncGalleryUploadPanels(mediaType);
  setGalleryUploadStatus(item.src ? 'Media loaded — update title/tag and save.' : '');
  const photoPreview = document.getElementById('gallery-upload-preview');
  const videoPreview = document.getElementById('gallery-video-preview');
  if (mediaType === 'video' && videoPreview && item.src) {
    videoPreview.src = item.src;
    videoPreview.hidden = false;
  } else if (photoPreview && (item.thumb || item.src)) {
    photoPreview.src = item.thumb || item.src;
    photoPreview.hidden = false;
  }
  const btn = f.querySelector('[type="submit"]');
  if (btn) btn.textContent = 'Update gallery item';
  const heading = f.querySelector('h2');
  if (heading) heading.textContent = 'Edit gallery item';
  showPanel('gallery');
  f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderGalleryList() {
  const el = document.getElementById('gallery-list');
  if (!el) return;
  el.innerHTML = state.gallery
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(
      (g) => `
    <div class="admin-card-item">
      <img src="${g.type === 'video' ? g.thumb || '' : g.thumb || g.src}" alt="" class="admin-thumb" />
      <div class="admin-card-item__body">
        <strong>${g.title || 'Untitled'}</strong>
        <span class="admin-muted">${g.type} · ${g.tag || ''}</span>
      </div>
      <button type="button" class="admin-btn admin-btn--ghost" data-edit-gallery="${g.id}">Edit</button>
      <button type="button" class="admin-btn admin-btn--danger" data-del-gallery="${g.id}">Delete</button>
    </div>`
    )
    .join('');

  el.querySelectorAll('[data-edit-gallery]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = state.gallery.find((g) => g.id === btn.dataset.editGallery);
      fillGalleryForm(item);
    });
  });

  el.querySelectorAll('[data-del-gallery]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete gallery item?')) return;
      try {
        const cms = getAdminCms();
        const gid = btn.dataset.delGallery;
        cms.gallery = (cms.gallery || []).filter((g) => g.id !== gid);
        await deleteGalleryFromFirestore(gid);
        adminToast('Deleted — live site updated', 'success');
        resetGalleryForm();
        await loadAllAdminData();
      } catch (err) {
        adminToast(err?.message || 'Delete failed', 'error');
      }
    });
  });
}

async function addGalleryImage(e) {
  e.preventDefault();
  const f = e.target;
  const cms = getAdminCms();
  if (!cms.gallery) cms.gallery = [];
  const src = f.src.value?.trim();
  if (!src) {
    adminToast(
      f.type.value === 'video'
        ? 'Upload a video file first (no URL required).'
        : 'Upload a photo first (no URL required).',
      'error'
    );
    return;
  }
  const item = {
    id: f.dataset.editId || `g-${Date.now()}`,
    type: f.type.value,
    src,
    thumb: f.thumb.value?.trim() || (f.type.value === 'image' ? src : ''),
    title: f.title.value,
    tag: f.tag.value,
    order: Number(f.order.value) || 0,
    active: true,
  };
  try {
    const editId = f.dataset.editId;
    if (editId) {
      const idx = cms.gallery.findIndex((g) => g.id === editId);
      if (idx >= 0) cms.gallery[idx] = { ...cms.gallery[idx], ...item, id: editId };
      else cms.gallery.push(item);
    } else {
      cms.gallery.push(item);
    }
    await saveGalleryItemToFirestore(item);
    resetGalleryForm();
    adminToast(editId ? 'Gallery item updated' : 'Gallery item added', 'success');
    await loadAllAdminData();
  } catch (err) {
    adminToast(err?.message || 'Could not save gallery item', 'error');
  }
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
      const cms = getAdminCms();
      const wid = btn.dataset.delWeather;
      cms.weatherCards = (cms.weatherCards || []).filter((w) => w.id !== wid);
      await deleteWeatherFromFirestore(wid);
      await loadAllAdminData();
      adminToast('Deleted — live site updated', 'success');
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
  try {
    const id = (f.dataset.editId || slugify(f.shortName.value || f.name.value)).trim();
    const cms = getAdminCms();
    const row = {
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
    };
    const list = [...(cms.weatherCards || [])];
    const idx = list.findIndex((w) => w.id === id);
    if (idx >= 0) list[idx] = row;
    else list.push(row);
    cms.weatherCards = list;
    await saveWeatherCardToFirestore(row);
    adminToast('Weather card saved — all devices updated', 'success');
    await loadAllAdminData();
  } catch (err) {
    adminToast(err?.message || 'Could not save weather card', 'error');
  }
}

function renderSearchDestCheckboxes() {
  const el = document.getElementById('search-dest-checkboxes');
  if (!el) return;
  const s = getAdminCms().settings || {};
  state.settingsCache = s;
  const enabled = new Set(s.searchEnabledIds || getAdminDestinationsForUi().map((d) => d.id));
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
}

async function saveSearchSettings() {
  try {
    const checked = [...document.querySelectorAll('#search-dest-checkboxes input:checked')].map(
      (i) => i.value
    );
    const cms = getAdminCms();
    cms.settings = { ...(cms.settings || {}), searchEnabledIds: checked };
    await saveSectionToFirestore('settings', cms.settings);
    adminToast('Search updated — all devices updated', 'success');
  } catch (err) {
    adminToast(err?.message || 'Could not save search settings', 'error');
  }
}

function initAdminAppHandlers() {
  initMobileSidebar();
  initTopbarMenu();
  openDestinationsPanelFromHash();
  window.addEventListener('hashchange', openDestinationsPanelFromHash);

  const destPanel = document.querySelector('.admin-dest-panel');
  bindDestinationsListFilters(destPanel, refreshDestinationsListUi);

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

  document.getElementById('form-about')?.addEventListener('submit', saveAboutForm);
  document.getElementById('form-contact')?.addEventListener('submit', saveContactForm);
  document.getElementById('form-socials')?.addEventListener('submit', saveSocialsForm);
  document.getElementById('form-settings')?.addEventListener('submit', saveSettingsForm);
  document.getElementById('form-gallery-add')?.addEventListener('submit', addGalleryImage);
  syncGalleryUploadPanels(
    document.getElementById('gallery-type-select')?.value || 'image'
  );
  document.getElementById('form-weather')?.addEventListener('submit', saveWeatherForm);
  document.getElementById('btn-save-search')?.addEventListener('click', saveSearchSettings);
  document.getElementById('btn-new-weather')?.addEventListener('click', () => openWeatherEditor(''));

  const bindZone = (inputId, previewId, folder, onUrl) => {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const progress = input?.closest('.admin-upload-zone')?.querySelector('.admin-upload-progress');
    createUploadZone(input, { previewEl: preview, progressEl: progress, folder, onUrl });
  };

  bindZone('about-upload', 'about-preview', 'about', async (url) => {
    const input = document.querySelector('#form-about [name="imageUrl"]');
    if (input) input.value = url;
    const cms = getAdminCms();
    cms.about = { ...(cms.about || {}), imageUrl: url, updatedAt: Date.now() };
    try {
      await saveSectionToFirestore('about', cms.about);
      adminToast('About image saved — all devices updated', 'success');
    } catch (err) {
      adminToast(err?.message || 'Image uploaded — click Save about to publish', 'error');
    }
  });
  bindZone('logo-upload', 'logo-preview', 'settings', async (url) => {
    const input = document.querySelector('#form-settings [name="logoUrl"]');
    if (input) input.value = url;
    const cms = getAdminCms();
    cms.settings = { ...(cms.settings || {}), logoUrl: url, updatedAt: Date.now() };
    try {
      await saveSectionToFirestore('settings', cms.settings);
      adminToast('Logo saved — all devices updated', 'success');
    } catch (err) {
      adminToast(err?.message || 'Image uploaded — click Save settings to publish', 'error');
    }
  });
  bindZone('gallery-upload', 'gallery-upload-preview', 'gallery', (url) => {
    const form = document.getElementById('form-gallery-add');
    if (!form) return;
    form.src.value = url;
    form.thumb.value = url;
    setGalleryUploadStatus('Photo uploaded — add title/tag and click Save to gallery.');
  });

  document.getElementById('gallery-type-select')?.addEventListener('change', (e) => {
    syncGalleryUploadPanels(e.target.value);
    setGalleryUploadStatus('');
  });

  const videoInput = document.getElementById('gallery-video-upload');
  const videoPreview = document.getElementById('gallery-video-preview');
  const videoProgress = document.querySelector('[data-video-progress]');
  videoInput?.addEventListener('change', async () => {
    const file = videoInput.files?.[0];
    videoInput.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      adminToast('Please choose a video file (MP4, WebM, MOV).', 'error');
      return;
    }
    const form = document.getElementById('form-gallery-add');
    if (!form) return;
    const setProgress = (pct) => {
      if (!videoProgress) return;
      videoProgress.hidden = false;
      const bar = videoProgress.querySelector('.admin-upload-progress__bar');
      const label = videoProgress.querySelector('.admin-upload-progress__label');
      if (bar) bar.style.width = `${pct}%`;
      if (label) label.textContent = pct >= 100 ? 'Processing…' : `Uploading ${pct}%`;
      if (pct >= 100) {
        setTimeout(() => {
          videoProgress.hidden = true;
          if (bar) bar.style.width = '0%';
        }, 600);
      }
    };
    try {
      adminToast('Uploading video to Cloudinary…', 'info');
      setProgress(0);
      const result = await cloudinaryUpload(file, 'gallery/videos', setProgress);
      setProgress(100);
      const poster = cloudinaryVideoPosterUrl(result);
      form.type.value = 'video';
      syncGalleryUploadPanels('video');
      form.src.value = result.secure_url;
      form.thumb.value = poster || result.secure_url;
      if (videoPreview) {
        videoPreview.src = result.secure_url;
        videoPreview.hidden = false;
      }
      setGalleryUploadStatus('Video uploaded — add title/tag and click Save to gallery.');
      adminToast('Video uploaded — click Save to gallery', 'success');
    } catch (err) {
      adminToast(err?.message || 'Video upload failed', 'error');
      setProgress(0);
      if (videoProgress) videoProgress.hidden = true;
    }
  });

  const refreshAdminFromFirestore = async () => {
    await loadAdminCms();
    state.destinations = getAdminCms().destinations || [];
    state.gallery = getAdminCms().gallery || [];
    state.weatherCards = getAdminCms().weatherCards || [];
    state.heroDoc = getAdminCms().hero;
    refreshDestinationsListUi();
    renderGalleryList();
    renderWeatherList();
    renderSearchDestCheckboxes();
    renderDashboard();
    loadPageHeroesPanel();
    await loadAboutForm();
    await loadContactForm();
    await loadSocialsForm();
    await loadSettingsForm();
  };

  void refreshAdminFromFirestore();

  initPageHeroesPanel();

  subscribeAdminFirestore(() => {
    void refreshAdminFromFirestore();
  });
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
