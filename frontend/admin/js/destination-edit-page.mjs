/**
 * Destination edit page — section nav, visual builders, save, autosave draft.
 */
import { getAuth, signOutAdmin, LOGIN_URL } from './firebase.js';
import { loadAdminCms, getDestinationFromCms } from './admin-cms.mjs';
import { subscribeAdminFirestore } from './admin-realtime.mjs';
import { protectAdminPage } from './admin-gate.mjs';
import { renderSidebar, initSidebar, userDisplayFromAuth } from './admin-layout.mjs';
import {
  initHighlightsChips,
  initItineraryBuilder,
  initImportantInfoBuilder,
} from './admin-form-builders.mjs';
import {
  loadDestinationById,
  saveDestinationRecord,
  collectDestinationPayload,
  deleteDestinationById,
  allocateUniqueDestinationId,
  parsePriceFieldsFromDestination,
  mergeDestinationsForAdmin,
} from './admin-destinations.mjs';
import { confirmDialog } from './admin-ui.mjs';
import { initDestinationGallery, normalizeGalleryItems } from './admin-destination-gallery.mjs';
import { createUploadZone } from './admin-cloudinary.mjs';
import { adminToast, slugify } from './admin-db.mjs';
import { bindUnsavedWarning } from './admin-ui.mjs';

const LIST_URL = '/admin/destinations/index.html';
const emptyBuilders = {
  included: { getValues: () => [] },
  excluded: { getValues: () => [] },
  itinerary: { getValues: () => [] },
  importantInfo: { getValues: () => [] },
};

/** Preserved legacy fields not shown in the simplified editor. */
let preservedPackages = [];
let preservedExperience = { label: '', title: '', intro: '', items: [] };

let dirty = false;
let saving = false;
let pageInitialized = false;
let builders = { ...emptyBuilders, gallery: { getValues: () => [] } };
let adminRealtimeUnsub = null;
const editId = new URLSearchParams(location.search).get('id')?.trim() || '';

function showToast(msg, type) {
  adminToast(msg, type);
}

function markDirty() {
  dirty = true;
  setAutosave('Unsaved changes', false);
}

function setAutosave(text, saved = true) {
  const el = document.getElementById('autosave-status');
  if (!el) return;
  el.textContent = saved ? `✓ ${text}` : text;
  el.style.color = saved ? '#22c55e' : '#fbbf24';
}

function showApp() {
  const app = document.getElementById('app');
  if (app) app.hidden = false;
  const loader = document.getElementById('admin-auth-loading');
  if (loader) {
    loader.hidden = true;
    loader.classList.add('is-hiding');
    loader.style.pointerEvents = 'none';
  }
  document.body.classList.add('admin-ready');
}

/** Bind save immediately — must not wait for async boot. */
function bindSaveControls() {
  if (bindSaveControls.done) return;
  bindSaveControls.done = true;

  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('#btn-save');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      void save();
    },
    true
  );

  document.getElementById('form-edit')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void save();
  });
}

async function save() {
  if (saving) return;

  const btn = document.getElementById('btn-save');
  const btnLabel = btn?.textContent;

  setAutosave('Saving…', false);

  if (!getAuth()?.currentUser) {
    showToast('Session expired. Please sign in again.', 'error');
    window.location.href = LOGIN_URL;
    return;
  }

  saving = true;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving…';
  }

  try {
    const form = document.getElementById('form-edit');
    if (!form) throw new Error('Edit form not found. Refresh the page.');

    const payload = collectPayloadForSave(form);
    if (!payload.name?.trim()) throw new Error('Destination name is required');
    if (!payload.id?.trim()) throw new Error('Could not create a destination URL. Check the name and try again.');

    const saved = await saveDestinationRecord(payload);
    dirty = false;
    showToast('Saved — live on all devices', 'success');
    setAutosave('Published successfully', true);

    if (builders.gallery?.setItems && Array.isArray(saved?.gallery)) {
      builders.gallery.setItems(saved.gallery);
    }

    setTimeout(() => {
      window.location.href = LIST_URL;
    }, 600);
  } catch (err) {
    console.error('[HAIBO] destination save failed', err);
    showToast(err?.message || 'Save failed', 'error');
    setAutosave('Save failed — try again', false);
    if (btn) {
      btn.disabled = false;
      btn.textContent = btnLabel || 'Save Changes';
    }
    saving = false;
  }
}

window.haiboSaveDestination = () => void save();

function collectPayloadForSave(form) {
  const existingIds = mergeDestinationsForAdmin()
    .map((d) => d.id)
    .filter(Boolean);
  return collectDestinationPayload(form, builders, {
    lockedId: editId || form.dataset.editId || '',
    preservedPackages,
    preservedExperience,
    allocateUnique: editId
      ? null
      : (name) => allocateUniqueDestinationId(name, existingIds),
  });
}

function initSectionNav() {
  const nav = document.getElementById('section-nav');
  const panels = document.querySelectorAll('[data-panel]');
  nav?.querySelectorAll('[data-section]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.section;
      nav.querySelectorAll('[data-section]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      panels.forEach((p) => {
        p.hidden = p.dataset.panel !== id;
      });
    });
  });
}

function initCharCounters() {
  const sub = document.querySelector('[name="subtitle"]');
  const overview = document.querySelector('[name="overview"]');
  const shortCount = document.getElementById('short-count');
  const overviewCount = document.getElementById('overview-count');
  const upd = () => {
    if (shortCount) shortCount.textContent = String((sub?.value || '').length);
    if (overviewCount) overviewCount.textContent = String((overview?.value || '').length);
  };
  sub?.addEventListener('input', () => {
    upd();
    markDirty();
  });
  overview?.addEventListener('input', () => {
    upd();
    markDirty();
  });
  upd();
}

function initRichToolbar() {
  /* Overview uses a plain textarea — rich toolbar removed from visible UI. */
}

function setImagePreview(field, url) {
  const isCard = field === 'image';
  const img = document.getElementById(isCard ? 'preview-card' : 'preview-hero');
  const input = document.querySelector(`[name="${field}"]`);
  if (input) input.value = url || '';
  if (img) {
    if (url) {
      img.src = url;
      img.hidden = false;
    } else {
      img.hidden = true;
      img.removeAttribute('src');
    }
  }
}

function bindImages() {
  document.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.pick)?.click();
    });
  });

  document.querySelectorAll('[data-clear-image]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setImagePreview(btn.dataset.clearImage, '');
      markDirty();
    });
  });

  const bindUpload = (inputId, field) => {
    const input = document.getElementById(inputId);
    const block = input?.closest('[data-image-block]');
    const progress = document.createElement('div');
    progress.className = 'admin-upload-progress';
    progress.hidden = true;
    progress.innerHTML = '<div style="height:4px;background:#d4a24c;width:0%;border-radius:2px"></div>';
    block?.appendChild(progress);

    createUploadZone(input, {
      dropzoneEl: block?.querySelector('[data-dropzone]') || block?.querySelector('.haibo-dropzone'),
      folder: 'destinations',
      onUrl: async (url) => {
        setImagePreview(field, url);
        markDirty();
        const form = document.getElementById('form-edit');
        if (!form) return;
        try {
          const payload = collectPayloadForSave(form);
          if (!payload.id?.trim() || !payload.name?.trim()) {
            showToast('Image uploaded — enter a destination name, then Save Changes', 'info');
            return;
          }
          if (field === 'image') {
            payload.image = url;
            payload.imageUrl = url;
            payload.cardImage = url;
          } else {
            payload.heroImage = url;
          }
          await saveDestinationRecord(payload);
          dirty = false;
          showToast('Image saved — all devices updated', 'success');
          setAutosave('Published successfully', true);
        } catch (err) {
          showToast(err?.message || 'Image uploaded — click Save Changes to publish', 'info');
        }
      },
    });
  };

  bindUpload('dest-card-upload', 'image');
  bindUpload('dest-hero-upload', 'heroImage');
}

async function persistGalleryOnly() {
  const form = document.getElementById('form-edit');
  if (!form) return;
  const payload = collectPayloadForSave(form);
  if (!payload.id?.trim() || !payload.name?.trim()) return;
  await saveDestinationRecord(payload);
  dirty = false;
  setAutosave('Gallery published', true);
}

function bindGallery(data) {
  const root = document.getElementById('dest-gallery-root');
  if (!root) return;
  const canPersist = () => Boolean(editId || formHasSlug());
  builders.gallery = initDestinationGallery(root, {
    initial: normalizeGalleryItems(data.gallery),
    destName: data.name || '',
    onChange: markDirty,
    canPersist,
    onPersist: persistGalleryOnly,
  });
}

function formHasSlug() {
  const id = document.querySelector('[name="id"]')?.value?.trim();
  const name = document.querySelector('[name="name"]')?.value?.trim();
  return Boolean(slugify(id || name || ''));
}

function bindBuilders(data) {
  const keepGallery = builders.gallery;
  builders = { ...emptyBuilders };
  if (keepGallery?.getValues) builders.gallery = keepGallery;

  preservedPackages = Array.isArray(data.packages) ? JSON.parse(JSON.stringify(data.packages)) : [];
  preservedExperience =
    data.experience && typeof data.experience === 'object'
      ? JSON.parse(JSON.stringify(data.experience))
      : { label: '', title: '', intro: '', items: [] };

  const includedRoot = document.getElementById('included-root');
  const excludedRoot = document.getElementById('excluded-root');
  const itineraryRoot = document.getElementById('itinerary-root');
  const infoRoot = document.getElementById('important-info-root');

  try {
    if (includedRoot) {
      const seed =
        Array.isArray(data.included) && data.included.length
          ? data.included.map((x) =>
              typeof x === 'string' ? x : [x?.title, x?.detail || x?.text].filter(Boolean).join(' — ')
            )
          : Array.isArray(preservedPackages[0]?.features)
            ? preservedPackages[0].features.map(String)
            : [];
      initHighlightsChips(includedRoot, seed);
      if (includedRoot.getValues) builders.included = includedRoot;
    }
  } catch (err) {
    console.warn('[HAIBO] included builder failed', err);
  }

  try {
    if (excludedRoot) {
      const seed =
        Array.isArray(data.excluded) && data.excluded.length
          ? data.excluded.map((x) =>
              typeof x === 'string' ? x : [x?.title, x?.detail || x?.text].filter(Boolean).join(' — ')
            )
          : [];
      initHighlightsChips(excludedRoot, seed);
      if (excludedRoot.getValues) builders.excluded = excludedRoot;
    }
  } catch (err) {
    console.warn('[HAIBO] excluded builder failed', err);
  }

  try {
    if (itineraryRoot) {
      initItineraryBuilder(itineraryRoot, data.itinerary || []);
      if (itineraryRoot.getValues) builders.itinerary = itineraryRoot;
    }
  } catch (err) {
    console.warn('[HAIBO] itinerary builder failed', err);
  }

  try {
    if (infoRoot) {
      initImportantInfoBuilder(infoRoot, data.importantInfo || []);
      if (infoRoot.getValues) builders.importantInfo = infoRoot;
    }
  } catch (err) {
    console.warn('[HAIBO] important info builder failed', err);
  }

  includedRoot?.addEventListener('change', markDirty);
  excludedRoot?.addEventListener('change', markDirty);
  itineraryRoot?.addEventListener('change', markDirty);
  infoRoot?.addEventListener('change', markDirty);
}

function fillForm(data) {
  const form = document.getElementById('form-edit');
  if (!form) return;

  form.dataset.editId = editId || data.id || '';

  const nameInput = form.querySelector('[name="name"]');
  const idInput = form.querySelector('[name="id"]');
  if (nameInput) nameInput.value = data.name || '';
  if (idInput) {
    idInput.value = data.id || '';
  }

  const regionSel = form.querySelector('[name="region"]');
  const regionVal = data.region || '';
  if (regionSel) {
    if (regionVal && ![...regionSel.options].some((o) => o.value === regionVal)) {
      regionSel.add(new Option(regionVal, regionVal));
    }
    regionSel.value = regionVal;
  }

  const bestSel = form.querySelector('[name="bestTime"]');
  const bestVal = data.bestTime || '';
  if (bestSel) {
    if (bestVal && ![...bestSel.options].some((o) => o.value === bestVal)) {
      bestSel.add(new Option(bestVal, bestVal));
    }
    bestSel.value = bestVal;
  }

  const pricing = parsePriceFieldsFromDestination(data);
  const setVal = (name, value) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el) el.value = value ?? '';
  };

  setVal('subtitle', data.subtitle || '');
  setVal('overview', data.overview || data.description || '');
  setVal('duration', pricing.duration);
  setVal('price', pricing.price);
  setVal('currency', pricing.currency || 'USD');
  setVal('priceType', pricing.priceType || 'per person');
  setVal('mapUrl', data.mapUrl || '');
  setVal('mapQuery', data.mapQuery || '');
  setVal('startingPoint', data.startingPoint || '');
  setVal('endingPoint', data.endingPoint || '');
  setVal('groupSize', data.groupSize || '');
  setVal('tourType', data.tourType || '');
  setVal('difficulty', data.difficulty || '');
  setVal('importantNotes', data.importantNotes || '');
  setVal('seoTitle', data.seoTitle || '');
  setVal('metaDescription', data.metaDescription || '');
  setVal('order', data.order ?? 0);

  const statusSel = form.querySelector('[name="publishStatus"]');
  if (statusSel) {
    if (data.status === 'archived') statusSel.value = 'archived';
    else if (data.active === false || data.status === 'draft') statusSel.value = 'draft';
    else statusSel.value = 'published';
  }

  setImagePreview('image', data.image || '');
  setImagePreview('heroImage', data.heroImage || data.image || '');

  bindBuilders(data);
  bindGallery(data);
  updateUrlPreview();

  const bc = document.getElementById('bc-name');
  if (bc) bc.textContent = data.name || 'New';
  document.title = `${data.name || 'New'} — HAIBO CMS`;

  initCharCounters();
  dirty = false;
  setAutosave('All changes saved', true);
}

function watchDirty() {
  document.getElementById('form-edit')?.querySelectorAll('input,textarea,select').forEach((el) => {
    el.addEventListener('input', markDirty);
    el.addEventListener('change', markDirty);
  });
}

async function loadData() {
  if (editId) {
    const data = await loadDestinationById(editId);
    if (!data) {
      showToast('Destination not found', 'error');
      window.location.href = LIST_URL;
      return null;
    }
    return data;
  }

  return {
    id: '',
    name: '',
    subtitle: '',
    region: '',
    description: '',
    overview: '',
    duration: '',
    price: '',
    currency: 'USD',
    priceType: 'per person',
    mapUrl: '',
    mapQuery: '',
    startingPoint: '',
    endingPoint: '',
    groupSize: '',
    tourType: '',
    difficulty: '',
    importantNotes: '',
    seoTitle: '',
    metaDescription: '',
    packages: [],
    experience: { label: '', title: '', intro: '', items: [] },
    highlights: [],
    included: [],
    excluded: [],
    itinerary: [],
    importantInfo: [],
    gallery: [],
    active: true,
    status: 'published',
    order: 0,
  };
}

function updateUrlPreview() {
  const preview = document.getElementById('url-preview');
  const name = document.querySelector('[name="name"]')?.value?.trim() || '';
  const idInput = document.querySelector('[name="id"]');
  if (!preview) return;
  if (editId) {
    preview.hidden = false;
    preview.textContent = `Public URL: /destinations/${editId}`;
    return;
  }
  const slug = slugify(name);
  if (!slug) {
    preview.hidden = true;
    preview.textContent = '';
    return;
  }
  preview.hidden = false;
  preview.textContent = `Public URL will be: /destinations/${slug}`;
  if (idInput && !editId) idInput.value = slug;
}

function nameInputSlugSync() {
  const name = document.querySelector('[name="name"]');
  if (!name) return;
  name.addEventListener('input', () => {
    updateUrlPreview();
  });
  updateUrlPreview();
}

async function bootPage(user) {
  if (pageInitialized) return;

  let bootError = null;

  try {
    renderSidebar(document.getElementById('sidebar-mount'), 'destinations', userDisplayFromAuth(user));
    initSidebar();
    document.getElementById('btn-logout-sidebar')?.addEventListener('click', async () => {
      await signOutAdmin();
      window.location.replace(LOGIN_URL);
    });

    initSectionNav();
    initRichToolbar();
    bindImages();
    bindUnsavedWarning(() => dirty);
    nameInputSlugSync();

    await loadAdminCms();
    const data = await loadData();
    if (data) fillForm(data);
    watchDirty();

    if (editId) {
      adminRealtimeUnsub?.();
      adminRealtimeUnsub = subscribeAdminFirestore(async () => {
        await loadAdminCms();
        const cmsDest = getDestinationFromCms(editId);
        if (!cmsDest || !builders.gallery?.setItems) return;
        builders.gallery.setItems(cmsDest.gallery);
      });
    }

    pageInitialized = true;
  } catch (err) {
    bootError = err;
    console.error('[HAIBO] edit page boot failed', err);
  } finally {
    showApp();
    if (bootError) {
      showToast(
        bootError?.message || 'Some form features failed to load. You can still save.',
        'error'
      );
    }
  }
}

function bindDeleteDestination() {
  const btn = document.getElementById('btn-delete-dest');
  if (!btn || !editId) return;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    const name = document.querySelector('[name="name"]')?.value?.trim() || editId;
    const ok = await confirmDialog({
      title: 'Delete destination permanently?',
      message: `"${name}" will be removed from the CMS and hidden from the live website. This cannot be undone.`,
      confirmLabel: 'Delete forever',
      danger: true,
    });
    if (!ok) return;
    btn.disabled = true;
    try {
      await deleteDestinationById(editId);
      showToast('Destination deleted', 'success');
      window.location.href = LIST_URL;
    } catch (err) {
      showToast(err?.message || 'Delete failed', 'error');
      btn.disabled = false;
    }
  });
}

bindSaveControls();

protectAdminPage(async (user) => {
  await bootPage(user);
  bindDeleteDestination();
});
