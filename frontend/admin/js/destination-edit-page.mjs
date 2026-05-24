/**
 * Destination edit page — section nav, visual builders, save, autosave draft.
 */
import { getAuth, signOutAdmin, LOGIN_URL } from './firebase.js';
import { loadAdminCms } from './admin-cms.mjs';
import { protectAdminPage } from './admin-gate.mjs';
import { renderSidebar, initSidebar, userDisplayFromAuth } from './admin-layout.mjs';
import {
  initHighlightsChips,
  initPackagesBuilder,
  initExperienceBuilder,
} from './admin-form-builders.mjs';
import {
  loadDestinationById,
  saveDestinationRecord,
  collectDestinationPayload,
} from './admin-destinations.mjs';
import { initDestinationGallery, normalizeGalleryItems } from './admin-destination-gallery.mjs';
import { createUploadZone } from './admin-cloudinary.mjs';
import { adminToast, slugify } from './admin-db.mjs';
import { bindUnsavedWarning } from './admin-ui.mjs';

const LIST_URL = '/admin/destinations/index.html';
const emptyBuilders = {
  highlights: { getValues: () => [] },
  packages: { getValues: () => [] },
  experience: { getValues: () => ({ label: '', title: '', intro: '', items: [] }) },
};

let dirty = false;
let saving = false;
let pageInitialized = false;
let builders = { ...emptyBuilders, gallery: { getValues: () => [] } };
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

    const payload = collectDestinationPayload(form, builders);
    if (!payload.name?.trim()) throw new Error('Destination name is required');
    if (!payload.id?.trim()) throw new Error('Slug is required');

    const saved = await saveDestinationRecord(payload);
    dirty = false;
    showToast('Saved — live on all devices', 'success');
    setAutosave('Published successfully', true);

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
  const desc = document.querySelector('[name="description"]');
  const shortCount = document.getElementById('short-count');
  const fullCount = document.getElementById('full-count');
  const upd = () => {
    if (shortCount) shortCount.textContent = String((sub?.value || '').length);
    if (fullCount) fullCount.textContent = String((desc?.value || '').length);
  };
  sub?.addEventListener('input', () => {
    upd();
    markDirty();
  });
  desc?.addEventListener('input', () => {
    upd();
    markDirty();
  });
  upd();
}

function initRichToolbar() {
  const desc = document.querySelector('[name="description"]');
  if (!desc) return;
  document.querySelectorAll('[data-toolbar] [data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      const start = desc.selectionStart;
      const end = desc.selectionEnd;
      const v = desc.value;
      let insert = '';
      if (cmd === 'bold') insert = '**bold**';
      if (cmd === 'italic') insert = '_italic_';
      if (cmd === 'ul') insert = '\n- item\n';
      desc.value = v.slice(0, start) + insert + v.slice(end);
      markDirty();
    });
  });
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
          const payload = collectDestinationPayload(form, builders);
          if (!payload.id?.trim() || !payload.name?.trim()) {
            showToast('Image uploaded — enter name and slug, then Save Changes', 'info');
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
  const payload = collectDestinationPayload(form, builders);
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
  builders = { ...emptyBuilders, gallery: { getValues: () => [] } };
  const hRoot = document.getElementById('highlights-root');
  const packagesPanel = document.querySelector('[data-panel="packages"]');
  const eRoot = document.querySelector('[data-panel="experiences"]');

  try {
    if (hRoot) {
      initHighlightsChips(hRoot, data.highlights || []);
      if (hRoot.getValues) builders.highlights = hRoot;
    }
  } catch (err) {
    console.warn('[HAIBO] highlights builder failed', err);
  }

  try {
    if (packagesPanel) {
      initPackagesBuilder(packagesPanel, data.packages || []);
      if (packagesPanel.getValues) builders.packages = packagesPanel;
    }
  } catch (err) {
    console.warn('[HAIBO] packages builder failed', err);
  }

  try {
    if (eRoot) {
      initExperienceBuilder(eRoot, data.experience || {});
      if (eRoot.getValues) builders.experience = eRoot;
    }
  } catch (err) {
    console.warn('[HAIBO] experience builder failed', err);
  }

  hRoot?.addEventListener('change', markDirty);
  packagesPanel?.addEventListener('change', markDirty);
  eRoot?.addEventListener('change', markDirty);
}

function fillForm(data) {
  const form = document.getElementById('form-edit');
  if (!form) return;

  form.dataset.editId = editId || data.id || '';
  if (!editId) form.querySelector('[name="id"]').disabled = false;

  const nameInput = form.querySelector('[name="name"]');
  const idInput = form.querySelector('[name="id"]');
  if (nameInput) nameInput.value = data.name || '';
  if (idInput) {
    idInput.value = data.id || '';
    idInput.disabled = Boolean(editId);
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

  const sub = form.querySelector('[name="subtitle"]');
  if (sub) sub.value = data.subtitle || data.description?.slice(0, 160) || '';
  const desc = form.querySelector('[name="description"]');
  if (desc) desc.value = data.description || '';
  const order = form.querySelector('[name="order"]');
  if (order) order.value = data.order ?? 0;
  const active = form.querySelector('[name="active"]');
  if (active) active.checked = data.active !== false;
  bindGallery(data);

  setImagePreview('image', data.image || '');
  setImagePreview('heroImage', data.heroImage || data.image || '');

  const bc = document.getElementById('bc-name');
  if (bc) bc.textContent = data.name || 'New';
  document.title = `${data.name || 'New'} — HAIBO CMS`;

  bindBuilders(data);
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
    packages: [],
    experience: { label: '', title: '', intro: '', items: [] },
    highlights: [],
    gallery: [],
    active: true,
    order: 0,
  };
}

function nameInputSlugSync() {
  const name = document.querySelector('[name="name"]');
  const id = document.querySelector('[name="id"]');
  if (!name || !id || editId) return;
  name.addEventListener('input', () => {
    if (!id.value || id.dataset.touched !== '1') {
      id.value = slugify(name.value);
    }
  });
  id.addEventListener('input', () => {
    id.dataset.touched = '1';
  });
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

bindSaveControls();

protectAdminPage(async (user) => {
  await bootPage(user);
});
