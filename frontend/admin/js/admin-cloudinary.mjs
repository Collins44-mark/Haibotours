import { adminToast } from './admin-db.mjs';

const recentUploads = [];

export function getRecentUploads() {
  return [...recentUploads];
}

export function pushRecentUpload(entry) {
  recentUploads.unshift(entry);
  if (recentUploads.length > 8) recentUploads.pop();
  window.dispatchEvent(new CustomEvent('haiboAdminUpload', { detail: entry }));
}

/** Cloudinary unsigned uploads — URLs saved to Firestore only */
export async function cloudinaryUpload(file, folder, onProgress) {
  if (!file) throw new Error('No file selected');
  const sub = folder || 'misc';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    form.append('folder', `${CLOUDINARY_CONFIG.baseFolder}/${sub}`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('Invalid upload response'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          secure_url: data.secure_url,
          public_id: data.public_id,
          folder: data.folder,
        });
      } else {
        reject(new Error(data.error?.message || 'Cloudinary upload failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.open('POST', url);
    xhr.send(form);
  });
}

export function createUploadZone(input, options = {}) {
  const {
    previewEl,
    progressEl,
    folder,
    onUrl,
    dropzoneEl,
  } = options;

  if (!input) return;

  const zone = dropzoneEl || input.closest('.admin-upload-zone');
  let objectUrl = null;

  function setProgress(pct) {
    if (!progressEl) return;
    progressEl.hidden = false;
    const bar = progressEl.querySelector('.admin-upload-progress__bar');
    const label = progressEl.querySelector('.admin-upload-progress__label');
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = pct >= 100 ? 'Processing…' : `Uploading ${pct}%`;
    if (pct >= 100) {
      setTimeout(() => {
        progressEl.hidden = true;
        if (bar) bar.style.width = '0%';
      }, 600);
    }
  }

  function showPreview(file) {
    if (!previewEl || !file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    previewEl.src = objectUrl;
    previewEl.classList.remove('hidden');
    previewEl.alt = `Preview: ${file.name}`;
  }

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      adminToast('Please choose an image file', 'error');
      return;
    }
    showPreview(file);
    try {
      adminToast('Uploading to Cloudinary…', 'info');
      setProgress(0);
      const result = await cloudinaryUpload(file, folder, setProgress);
      setProgress(100);
      if (previewEl) {
        previewEl.src = result.secure_url;
        previewEl.classList.remove('hidden');
      }
      if (onUrl) onUrl(result.secure_url);
      pushRecentUpload({
        url: result.secure_url,
        folder,
        name: file.name,
        at: Date.now(),
      });
      adminToast('Image uploaded successfully', 'success');
      input.value = '';
    } catch (e) {
      adminToast(e.message, 'error');
      setProgress(0);
      if (progressEl) progressEl.hidden = true;
    }
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) handleFile(file);
  });

  if (zone) {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('is-dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    });
  }
}

/** @deprecated use createUploadZone */
export function bindImageUpload(input, previewEl, folder, onUrl) {
  const progressEl = input?.closest('.admin-upload-zone')?.querySelector('.admin-upload-progress');
  createUploadZone(input, { previewEl, progressEl, folder, onUrl });
}
