/**
 * Visual destination gallery manager — Cloudinary image/video upload, reorder.
 */
import { cloudinaryUpload } from './admin-cloudinary.mjs';
import { adminToast } from './admin-db.mjs';

function inferGalleryType(item, url) {
  if (item?.type === 'video' || item?.type === 'image') return item.type;
  const u = String(url || '').toLowerCase();
  if (u.includes('/video/upload/') || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return 'video';
  return 'image';
}

export function normalizeGalleryItems(gallery) {
  if (!Array.isArray(gallery)) return [];
  const items = gallery
    .map((item, i) => {
      if (typeof item === 'string') {
        const url = item.trim();
        if (!url) return null;
        return { url, alt: '', order: i, type: inferGalleryType(null, url) };
      }
      const url = String(item?.url || item?.src || '').trim();
      if (!url) return null;
      return {
        url,
        alt: String(item?.alt || item?.title || '').trim(),
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : i,
        type: inferGalleryType(item, url),
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

function mediaPreviewHtml(item) {
  if (item.type === 'video') {
    return `<video src="${escapeHtml(item.url)}" muted playsinline preload="metadata" class="dest-gallery-admin__video"></video><span class="dest-gallery-admin__badge">Video</span>`;
  }
  return `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || 'Gallery')}" loading="lazy" decoding="async" />`;
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

  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.multiple = true;
  imageInput.hidden = true;
  root.appendChild(imageInput);

  const videoInput = document.createElement('input');
  videoInput.type = 'file';
  videoInput.accept = 'video/*';
  videoInput.multiple = true;
  videoInput.hidden = true;
  root.appendChild(videoInput);

  const replaceInput = document.createElement('input');
  replaceInput.type = 'file';
  replaceInput.accept = 'image/*,video/*';
  replaceInput.hidden = true;
  root.appendChild(replaceInput);
  let replaceAt = -1;

  function emitChange() {
    options.onChange?.(state.items);
  }

  async function uploadFile(file) {
    const isVideo = file?.type?.startsWith('video/');
    const isImage = file?.type?.startsWith('image/');
    if (!isVideo && !isImage) {
      adminToast('Please choose an image or video file', 'error');
      return null;
    }
    const result = await cloudinaryUpload(file, 'destinations/gallery', (pct) => {
      const bar = root.querySelector('[data-gallery-upload-bar]');
      if (bar) bar.style.width = `${pct}%`;
    });
    return {
      url: result.secure_url,
      type: isVideo ? 'video' : 'image',
    };
  }

  async function addFiles(files, kind) {
    if (!files?.length || uploading) return;
    uploading = true;
    root.classList.add('is-uploading');
    try {
      for (const file of files) {
        if (kind === 'image' && !file.type.startsWith('image/')) continue;
        if (kind === 'video' && !file.type.startsWith('video/')) continue;
        adminToast(`Uploading ${file.name}…`, 'info');
        const uploaded = await uploadFile(file);
        if (!uploaded?.url) continue;
        const alt =
          uploaded.type === 'video'
            ? options.destName
              ? `${options.destName} safari video`
              : 'Safari gallery video'
            : options.destName
              ? `${options.destName} safari gallery`
              : 'Safari gallery photo';
        state.items.push({
          url: uploaded.url,
          alt,
          order: state.items.length,
          type: uploaded.type,
        });
      }
      render();
      emitChange();
      if (options.canPersist?.()) {
        await options.onPersist?.();
        adminToast('Gallery saved — live on website', 'success');
      } else {
        adminToast('Media added — save destination to publish', 'info');
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
      const uploaded = await uploadFile(file);
      if (!uploaded?.url) return;
      state.items[index] = {
        ...state.items[index],
        url: uploaded.url,
        type: uploaded.type,
      };
      render();
      emitChange();
      if (options.canPersist?.()) {
        await options.onPersist?.();
        adminToast('Media replaced', 'success');
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
      adminToast('Removed from gallery', 'success');
    }
  }

  function render() {
    const imageCount = state.items.filter((i) => i.type !== 'video').length;
    const videoCount = state.items.filter((i) => i.type === 'video').length;
    const cards = state.items
      .map(
        (item, i) => `
      <div class="dest-gallery-admin__card${item.type === 'video' ? ' dest-gallery-admin__card--video' : ''}" data-gallery-index="${i}" draggable="true">
        <div class="dest-gallery-admin__thumb">
          ${mediaPreviewHtml(item)}
        </div>
        <div class="dest-gallery-admin__actions">
          <button type="button" class="dest-gallery-admin__btn" data-gallery-drag="${i}" title="Drag to reorder" aria-label="Drag">⋮⋮</button>
          <button type="button" class="dest-gallery-admin__btn" data-gallery-replace="${i}" title="Replace">↻</button>
          <button type="button" class="dest-gallery-admin__btn dest-gallery-admin__btn--danger" data-gallery-remove="${i}" title="Remove">×</button>
        </div>
        <input type="text" class="dest-gallery-admin__alt haibo-input" data-gallery-alt="${i}" value="${escapeHtml(item.alt)}" placeholder="Caption (optional)" />
      </div>`
      )
      .join('');

    root.innerHTML = `
      <div class="dest-gallery-admin">
        <div class="dest-gallery-admin__toolbar">
          <button type="button" class="haibo-btn haibo-btn--primary haibo-btn--sm" data-gallery-add-image ${uploading ? 'disabled' : ''}>+ Upload images</button>
          <button type="button" class="haibo-btn haibo-btn--ghost haibo-btn--sm" data-gallery-add-video ${uploading ? 'disabled' : ''}>+ Upload video</button>
          <span class="dest-gallery-admin__count">${imageCount} image${imageCount === 1 ? '' : 's'}, ${videoCount} video${videoCount === 1 ? '' : 's'}</span>
        </div>
        <div class="dest-gallery-admin__progress" hidden data-gallery-progress>
          <div class="dest-gallery-admin__progress-bar" data-gallery-upload-bar></div>
        </div>
        <div class="dest-gallery-admin__grid">
          <button type="button" class="dest-gallery-admin__upload-tile" data-gallery-add-image aria-label="Upload images">
            <span class="dest-gallery-admin__upload-icon">+</span>
            <span>Image</span>
          </button>
          <button type="button" class="dest-gallery-admin__upload-tile dest-gallery-admin__upload-tile--video" data-gallery-add-video aria-label="Upload video">
            <span class="dest-gallery-admin__upload-icon">▶</span>
            <span>Video</span>
          </button>
          ${cards}
        </div>
        <p class="dest-gallery-admin__hint">Drag to reorder. Unpublished destinations and draft items stay hidden on the live site until you publish.</p>
      </div>`;

    bind();
  }

  function bind() {
    root.querySelectorAll('[data-gallery-add-image]').forEach((btn) => {
      btn.addEventListener('click', () => imageInput.click());
    });
    root.querySelectorAll('[data-gallery-add-video]').forEach((btn) => {
      btn.addEventListener('click', () => videoInput.click());
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

  imageInput.addEventListener('change', () => {
    const files = [...(imageInput.files || [])];
    imageInput.value = '';
    const progress = root.querySelector('[data-gallery-progress]');
    if (progress) progress.hidden = false;
    void addFiles(files, 'image').finally(() => {
      if (progress) progress.hidden = true;
    });
  });

  videoInput.addEventListener('change', () => {
    const files = [...(videoInput.files || [])];
    videoInput.value = '';
    const progress = root.querySelector('[data-gallery-progress]');
    if (progress) progress.hidden = false;
    void addFiles(files, 'video').finally(() => {
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
