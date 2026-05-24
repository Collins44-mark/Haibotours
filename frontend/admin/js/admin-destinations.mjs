/**
 * Destination list + save — Firestore only.
 */
import {
  getAdminCms,
  upsertDestinationInCms,
  removeDestinationFromCms,
  getDestinationFromCms,
  listDestinationsForAdmin,
  addDeletedDestinationId,
  removeDeletedDestinationId,
  getDeletedDestinationIds,
} from './admin-cms.mjs';
import { slugify, dbSetDoc, dbDeleteDoc, sanitizeFirestoreData } from './admin-db.mjs';
import { normalizeGalleryItems } from './admin-destination-gallery.mjs';
import { confirmDialog, formatRelativeTime, showToast } from './admin-ui.mjs';

export const DEST_EDIT_BASE = '/admin/destinations/edit.html';

export function destinationEditUrl(id) {
  const slug = id ? String(id).trim().toLowerCase().replace(/\s+/g, '-') : '';
  return slug ? `${DEST_EDIT_BASE}?id=${encodeURIComponent(slug)}` : DEST_EDIT_BASE;
}

export function getStaticDestinations() {
  return (
    window.HAIBO_DESTINATIONS_STATIC ||
    (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS : [])
  );
}

/** Admin list: static catalog + Firestore overrides; excludes permanently deleted IDs. */
export function mergeDestinationsForAdmin() {
  const deleted = new Set(getDeletedDestinationIds());
  const cmsRows = listDestinationsForAdmin();
  const staticList = getStaticDestinations();

  let list;
  if (typeof haiboMergeDestinationsList === 'function' && staticList.length > 0) {
    list = haiboMergeDestinationsList(cmsRows).map((d) => ({
      ...d,
      _source: d._fromFirestore ? 'cms' : 'catalog',
    }));
  } else {
    list = cmsRows.map((d) => ({ ...d, _source: 'cms' }));
  }

  return list.filter((d) => !deleted.has(destinationIdKey(d.id)));
}

function destinationIdKey(id) {
  if (typeof haiboNormalizeDestId === 'function') {
    return haiboNormalizeDestId(id);
  }
  return slugify(String(id || '').trim());
}

export function collectDestinationPayload(form, builders) {
  const slugInput = form.querySelector('[name="id"]');
  const id = slugify(
    (
      slugInput?.value?.trim() ||
      form.dataset.editId ||
      slugify(form.querySelector('[name="name"]')?.value)
    ).trim()
  );
  const published = form.querySelector('[name="active"]')?.checked !== false;
  return {
    id,
    name: form.querySelector('[name="name"]')?.value?.trim() || '',
    subtitle: form.querySelector('[name="subtitle"]')?.value?.trim() || '',
    region: form.querySelector('[name="region"]')?.value?.trim() || '',
    image: form.querySelector('[name="image"]')?.value?.trim() || '',
    imageUrl: form.querySelector('[name="image"]')?.value?.trim() || '',
    cardImage: form.querySelector('[name="image"]')?.value?.trim() || '',
    heroImage:
      form.querySelector('[name="heroImage"]')?.value?.trim() ||
      form.querySelector('[name="image"]')?.value?.trim() ||
      '',
    description: form.querySelector('[name="description"]')?.value?.trim() || '',
    bestTime: form.querySelector('[name="bestTime"]')?.value?.trim() || '',
    highlights: builders.highlights?.getValues?.() ?? [],
    gallery: builders.gallery?.getValues?.() ?? [],
    packages: builders.packages?.getValues?.() ?? [],
    experience: builders.experience?.getValues?.() ?? {},
    active: published,
    published,
    order: Number(form.querySelector('[name="order"]')?.value) || 0,
    status: published ? 'published' : 'draft',
  };
}

export function galleryForFirestore(gallery) {
  return normalizeGalleryItems(gallery).map(({ url, alt, order, type }) => ({
    url,
    alt: alt || '',
    order,
    type: type === 'video' ? 'video' : 'image',
  }));
}

export async function saveDestinationRecord(payload) {
  if (!payload.id) throw new Error('Destination ID (slug) is required');
  if (!payload.name) throw new Error('Destination name is required');

  const { _source, ...rest } = payload;
  const id = slugify(String(rest.id).trim());
  const published = rest.active !== false;
  const gallery = galleryForFirestore(rest.gallery);
  const row = upsertDestinationInCms({
    ...rest,
    id,
    slug: id,
    gallery,
    active: published,
    published,
    status: published ? 'published' : 'draft',
  });

  const coll = globalThis.FIRESTORE_PATHS?.destinations || 'destinations';
  const docData = sanitizeFirestoreData({
    ...row,
    id,
    slug: id,
    gallery,
    updatedAt: Date.now(),
  });
  await dbSetDoc(coll, docData, id);
  await removeDeletedDestinationId(id);
  console.log('[HAIBO] Firestore updated successfully', `destinations/${id}`, {
    galleryCount: gallery.length,
  });
  return row;
}

export async function deleteDestinationById(id) {
  const slug = slugify(String(id).trim());
  if (!slug) return;
  removeDestinationFromCms(slug);
  const coll = globalThis.FIRESTORE_PATHS?.destinations || 'destinations';
  await dbDeleteDoc(coll, slug);
  await addDeletedDestinationId(slug);
  console.log('[HAIBO] Firestore deleted', `destinations/${slug}`);
}

export async function loadDestinationById(id) {
  if (!id) return null;
  const key = destinationIdKey(id);
  const fromCms = getDestinationFromCms(key);
  const row = mergeDestinationsForAdmin().find((d) => destinationIdKey(d.id) === key);
  if (!row && !fromCms) return null;

  const base = row ? { ...row } : { ...fromCms, id: key };
  const gallery =
    fromCms && Object.prototype.hasOwnProperty.call(fromCms, 'gallery')
      ? normalizeGalleryItems(fromCms.gallery)
      : normalizeGalleryItems(base.gallery);

  return {
    ...base,
    id: key,
    gallery,
    _source: fromCms ? 'firestore' : 'catalog',
  };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function renderDestinationsList(el, destinations, { onRefresh }) {
  if (!el) return;

  const q = (el.closest('.admin-dest-panel')?.querySelector('[data-dest-search]')?.value || '')
    .trim()
    .toLowerCase();
  const region = el.closest('.admin-dest-panel')?.querySelector('[data-dest-filter-region]')?.value || '';
  const status = el.closest('.admin-dest-panel')?.querySelector('[data-dest-filter-status]')?.value || '';
  const sort = el.closest('.admin-dest-panel')?.querySelector('[data-dest-sort]')?.value || 'order';

  let list = [...destinations];
  if (q) {
    list = list.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.id?.toLowerCase().includes(q) ||
        d.region?.toLowerCase().includes(q)
    );
  }
  if (region) list = list.filter((d) => d.region === region);
  if (status === 'published') list = list.filter((d) => d.active !== false);
  if (status === 'draft') list = list.filter((d) => d.active === false);

  if (sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sort === 'updated') list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  else list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (!list.length) {
    el.innerHTML = `<div class="admin-empty">
      <p>No destinations yet.</p>
      <button type="button" class="admin-btn admin-btn--primary" data-new-dest>Add destination</button>
    </div>`;
    el.querySelector('[data-new-dest]')?.addEventListener('click', () => {
      window.location.href = destinationEditUrl('');
    });
    return;
  }

  el.innerHTML = `<div class="admin-dest-grid">${list
    .map((d) => {
      const published = d.active !== false;
      const badge = published
        ? '<span class="admin-badge admin-badge--success">Live</span>'
        : '<span class="admin-badge admin-badge--warn">Draft</span>';
      const img = d.image || d.heroImage || '';
      return `
      <article class="admin-dest-card" data-dest-id="${escapeHtml(d.id)}">
        <div class="admin-dest-card__media">
          ${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" />` : '<div class="admin-dest-card__placeholder">No image</div>'}
        </div>
        <div class="admin-dest-card__body">
          <div class="admin-dest-card__top">
            <h3>${escapeHtml(d.name)}</h3>
            ${badge}
          </div>
          <p class="admin-muted">${escapeHtml(d.subtitle || '')} · ${escapeHtml(d.region || '—')}</p>
          <p class="admin-dest-card__meta">Updated ${formatRelativeTime(d.updatedAt)}</p>
        </div>
        <div class="admin-dest-card__actions">
          <a href="${destinationEditUrl(d.id)}" class="admin-btn admin-btn--primary admin-btn--sm">Edit</a>
          <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-del-dest="${escapeHtml(d.id)}">Delete</button>
        </div>
      </article>`;
    })
    .join('')}</div>`;

  el.querySelectorAll('[data-del-dest]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.delDest;
      const ok = await confirmDialog({
        title: 'Delete destination?',
        message: `Permanently delete "${id}"? It will be removed from the CMS and hidden on the live website.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
      btn.disabled = true;
      try {
        await deleteDestinationById(id);
        showToast('Destination deleted', 'success');
        onRefresh?.();
      } catch (err) {
        showToast(err.message || 'Delete failed', 'error');
        btn.disabled = false;
      }
    });
  });
}

export function bindDestinationsListFilters(panel, onFilter) {
  panel?.querySelectorAll('[data-dest-search],[data-dest-filter-region],[data-dest-filter-status],[data-dest-sort]').forEach((el) => {
    el.addEventListener('input', () => onFilter?.());
    el.addEventListener('change', () => onFilter?.());
  });
}
