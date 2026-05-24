/**
 * Visual destination gallery manager — Cloudinary upload, reorder, no URL textarea.
 */
import { cloudinaryUpload } from './admin-cloudinary.mjs';
import { adminToast } from './admin-db.mjs';

export function normalizeGalleryItems(gallery) {
  if (!Array.isArray(gallery)) return [];
  const items = gallery
    .map((item, i) => {
      if (typeof item === 'string') {
        const url = item.trim();
        if (!url) return null;
        return { url, alt: '', order: i };
      }
      const url = String(item?.url || item?.src || '').trim();
      if (!url) return null;
      return {
        url,
        alt: String(item?.alt || item?.title || '').trim(),
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : i,
      };
    })
    .filter(Boolean);
  items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return items.map((it, idx) => ({ ...it, order: idx }));
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement} root
 * @param {{ initial?: unknown[], destName?: string, onChange?: Function, onPersist?: () => Promise<void>, canPersist?: () => boolean }} options
 */
export function initDestinationGallery(root, options = {}) {
  if (!root) return { getValues: () => [] };

  const state = { items: normalizeGalleryItems(options.initial) };
  let dragIndex = null;
  let uploading = false;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.hidden = true;
  root.appendChild(fileInput);

  const replaceInput = document.createElement('input');
  replaceInput.type = 'file';
  replaceInput.accept = 'image/*';
  replaceInput.hidden = true;
  root.appendChild(replaceInput);
  let replaceAt = -1;

  function emitChange() {
    options.onChange?.(state.items);
  }

  async function uploadFile(file) {
    if (!file?.type?.startsWith('image/')) {
      adminToast('Please choose an image file', 'error');
      return null;
    }
    const result = await cloudinaryUpload(file, 'destinations/gallery', (pct) => {
      const bar = root.querySelector('[data-gallery-upload-bar]');
      if (bar) bar.style.width = `${pct}%`;
    });
    return result.secure_url;
  }

  async function addFiles(files) {
    if (!files?.length || uploading) return;
    uploading = true;
    root.classList.add('is-uploading');
    try {
      for (const file of files) {
        adminToast(`Uploading ${file.name}…`, 'info');
        const url = await uploadFile(file);
        if (!url) continue;
        const alt = options.destName
          ? `${options.destName} safari gallery`
          : 'Safari gallery photo';
        state.items.push({ url, alt, order: state.items.length });
      }
      render();
      emitChange();
      if (options.canPersist?.()) {
        await options.onPersist?.();
        adminToast('Gallery saved — live on website', 'success');
      } else {
        adminToast('Images added — save destination to publish', 'info');
      }
    } catch (err) {
      adminToast(err?.message || 'Upload failed', 'error');
    } finally {
      uploading = false;
      root.classList.remove('is-uploading');
      const bar = root.querySelector('[data-gallery-upload-bar]');
      if (bar) bar.style.width = '0%';
    }
  }

  async function replaceAtIndex(index, file) {
    try {
      const url = await uploadFile(file);
      if (!url) return;
      state.items[index] = { ...state.items[index], url };
      render();
      emitChange();
      if (options.canPersist?.()) {
        await options.onPersist?.();
        adminToast('Image replaced', 'success');
      }
    } catch (err) {
      adminToast(err?.message || 'Replace failed', 'error');
    }
  }

  async function removeAt(index) {
    state.items.splice(index, 1);
    state.items = state.items.map((it, i) => ({ ...it, order: i }));
    render();
    emitChange();
    if (options.canPersist?.()) {
      await options.onPersist?.();
      adminToast('Image removed', 'success');
    }
  }

  function render() {
    const cards = state.items
      .map(
        (item, i) => `
      <div class="dest-gallery-admin__card" data-gallery-index="${i}" draggable="true">
        <div class="dest-gallery-admin__thumb">
          <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || 'Gallery')}" loading="lazy" decoding="async" />
        </div>
        <div class="dest-gallery-admin__actions">
          <button type="button" class="dest-gallery-admin__btn" data-gallery-drag="${i}" title="Drag to reorder" aria-label="Drag">⋮⋮</button>
          <button type="button" class="dest-gallery-admin__btn" data-gallery-replace="${i}" title="Replace">↻</button>
          <button type="button" class="dest-gallery-admin__btn dest-gallery-admin__btn--danger" data-gallery-remove="${i}" title="Remove">×</button>
        </div>
        <input type="text" class="dest-gallery-admin__alt haibo-input" data-gallery-alt="${i}" value="${escapeHtml(item.alt)}" placeholder="Alt text (optional)" />
      </div>`
      )
      .join('');

    root.innerHTML = `
      <div class="dest-gallery-admin">
        <div class="dest-gallery-admin__toolbar">
          <button type="button" class="haibo-btn haibo-btn--primary haibo-btn--sm" data-gallery-add ${uploading ? 'disabled' : ''}>+ Upload images</button>
          <span class="dest-gallery-admin__count">${state.items.length} image${state.items.length === 1 ? '' : 's'}</span>
        </div>
        <div class="dest-gallery-admin__progress" hidden data-gallery-progress>
          <div class="dest-gallery-admin__progress-bar" data-gallery-upload-bar></div>
        </div>
        <div class="dest-gallery-admin__grid">
          <button type="button" class="dest-gallery-admin__upload-tile" data-gallery-add aria-label="Upload images">
            <span class="dest-gallery-admin__upload-icon">+</span>
            <span>Upload</span>
          </button>
          ${cards}
        </div>
        <p class="dest-gallery-admin__hint">Drag cards to reorder. Changes publish to the live destination page when saved.</p>
      </div>`;

    bind();
  }

  function bind() {
    root.querySelectorAll('[data-gallery-add]').forEach((btn) => {
      btn.addEventListener('click', () => fileInput.click());
    });

    root.querySelectorAll('[data-gallery-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.galleryRemove);
        if (!Number.isFinite(i)) return;
        void removeAt(i);
      });
    });

    root.querySelectorAll('[data-gallery-replace]').forEach((btn) => {
      btn.addEventListener('click', () => {
        replaceAt = Number(btn.dataset.galleryReplace);
        if (!Number.isFinite(replaceAt)) return;
        replaceInput.click();
      });
    });

    root.querySelectorAll('[data-gallery-alt]').forEach((input) => {
      input.addEventListener('change', () => {
        const i = Number(input.dataset.galleryAlt);
        if (!Number.isFinite(i) || !state.items[i]) return;
        state.items[i].alt = input.value.trim();
        emitChange();
      });
    });

    root.querySelectorAll('.dest-gallery-admin__card[draggable]').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        dragIndex = Number(card.dataset.galleryIndex);
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        dragIndex = null;
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      card.addEventListener('drop', async (e) => {
        e.preventDefault();
        const to = Number(card.dataset.galleryIndex);
        if (dragIndex == null || dragIndex === to || !Number.isFinite(to)) return;
        const [moved] = state.items.splice(dragIndex, 1);
        state.items.splice(to, 0, moved);
        state.items = state.items.map((it, i) => ({ ...it, order: i }));
        render();
        emitChange();
        if (options.canPersist?.()) await options.onPersist?.();
      });
    });
  }

  fileInput.addEventListener('change', () => {
    const files = [...(fileInput.files || [])];
    fileInput.value = '';
    const progress = root.querySelector('[data-gallery-progress]');
    if (progress) progress.hidden = false;
    void addFiles(files).finally(() => {
      if (progress) progress.hidden = true;
    });
  });

  replaceInput.addEventListener('change', () => {
    const file = replaceInput.files?.[0];
    replaceInput.value = '';
    if (file && replaceAt >= 0) void replaceAtIndex(replaceAt, file);
    replaceAt = -1;
  });

  render();

  return {
    getValues: () => normalizeGalleryItems(state.items),
    setItems: (items) => {
      state.items = normalizeGalleryItems(items);
      render();
    },
  };
}
