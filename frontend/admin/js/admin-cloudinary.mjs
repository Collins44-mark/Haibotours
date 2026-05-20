import { adminToast } from './admin-db.mjs';

/** Cloudinary unsigned uploads — URLs saved to Firestore only */
export async function cloudinaryUpload(file, folder) {
  if (!file) throw new Error('No file selected');
  const sub = folder || 'misc';
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  form.append('folder', `${CLOUDINARY_CONFIG.baseFolder}/${sub}`);

  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Cloudinary upload failed');
  }
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    folder: data.folder,
  };
}

export function bindImageUpload(input, previewEl, folder, onUrl) {
  if (!input) return;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      adminToast('Uploading image…', 'info');
      const result = await cloudinaryUpload(file, folder);
      if (previewEl) {
        previewEl.src = result.secure_url;
        previewEl.classList.remove('hidden');
      }
      if (onUrl) onUrl(result.secure_url);
      adminToast('Image uploaded', 'success');
      input.value = '';
    } catch (e) {
      adminToast(e.message, 'error');
    }
  });
}
