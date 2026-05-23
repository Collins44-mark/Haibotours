/**
 * Destination list + save helpers (shared dashboard & edit page).
 */
import { dbSetDoc, dbDeleteDoc, dbGetDocOptional, adminToast, slugify } from './admin-db.mjs';
import { confirmDialog, formatRelativeTime, showToast } from './admin-ui.mjs';

function firestorePaths() {
  const paths = globalThis.FIRESTORE_PATHS;
  if (!paths?.destinations) {
    throw new Error('Firebase is not loaded. Refresh the page and try again.');
  }
  return paths;
}

export const DEST_EDIT_BASE = '/admin/destinations/edit.html';

export function destinationEditUrl(id) {
  return id ? `${DEST_EDIT_BASE}?id=${encodeURIComponent(id)}` : DEST_EDIT_BASE;
}

export function getStaticDestinations() {
  return (
    window.HAIBO_DESTINATIONS_STATIC ||
    (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS : [])
  );
}

export function mergeDestinationsForAdmin(firestoreRows) {
  const staticList = getStaticDestinations();
  if (!firestoreRows?.length) {
    return staticList.map((d, i) => ({ ...d, order: i, _source: 'static', updatedAt: null }));
  }
  const byId = new Map(firestoreRows.map((d) => [d.id, { ...d, _source: 'firestore' }]));
  staticList.forEach((d, i) => {
    if (!byId.has(d.id)) {
      byId.set(d.id, { ...d, order: 500 + i, _source: 'static', updatedAt: null });
    }
  });
  return [...byId.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function collectDestinationPayload(form, builders) {
  const slugInput = form.querySelector('[name="id"]');
  const id = (
    slugInput?.value?.trim() ||
    form.dataset.editId ||
    slugify(form.querySelector('[name="name"]')?.value)
  ).trim();
  const galleryRaw = form.querySelector('[name="galleryUrls"]')?.value || '';
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
    gallery: galleryRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    packages: builders.packages?.getValues?.() ?? [],
    experience: builders.experience?.getValues?.() ?? {},
    active: form.querySelector('[name="active"]')?.checked !== false,
    order: Number(form.querySelector('[name="order"]')?.value) || 0,
    status: form.querySelector('[name="active"]')?.checked !== false ? 'published' : 'draft',
  };
}

export async function saveDestinationRecord(payload) {
  if (!payload.id) throw new Error('Destination ID (slug) is required');
  if (!payload.name) throw new Error('Destination name is required');

  const { _source, ...rest } = payload;
  const row = {
    ...rest,
    id: String(rest.id).trim(),
    active: rest.active !== false,
    updatedAt: Date.now(),
    _fromFirestore: true,
  };

  await dbSetDoc(firestorePaths().destinations, row, row.id);
  return row;
}

export async function loadDestinationById(id) {
  const paths = globalThis.FIRESTORE_PATHS;
  let fromDb = null;
  if (paths?.destinations) {
    fromDb = await dbGetDocOptional(paths.destinations, id);
  }
  if (fromDb) return { ...fromDb, id, _source: 'firestore' };
  const stat = getStaticDestinations().find((d) => d.id === id);
  return stat ? { ...stat, _source: 'static' } : null;
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
  if (status === 'published') list = list.filter((d) => d.active !== false && d._source === 'firestore');
  if (status === 'draft') list = list.filter((d) => d.active === false);
  if (status === 'default') list = list.filter((d) => d._source === 'static');

  if (sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sort === 'updated') list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  else list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (!list.length) {
    el.innerHTML = `<div class="admin-empty">
      <p>No destinations match your filters.</p>
      <button type="button" class="admin-btn admin-btn--primary" data-new-dest>Add destination</button>
    </div>`;
    el.querySelector('[data-new-dest]')?.addEventListener('click', () => {
      window.location.href = destinationEditUrl('');
    });
    return;
  }

  el.innerHTML = `<div class="admin-dest-grid">${list
    .map((d) => {
      const published = d._source === 'firestore' && d.active !== false;
      const badge = published
        ? '<span class="admin-badge admin-badge--success">Published</span>'
        : d._source === 'static'
          ? '<span class="admin-badge admin-badge--muted">Default</span>'
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
          ${
            d._source === 'firestore'
              ? `<button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" data-del-dest="${escapeHtml(d.id)}">Delete</button>`
              : ''
          }
        </div>
      </article>`;
    })
    .join('')}</div>`;

  el.querySelectorAll('[data-del-dest]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.delDest;
      const ok = await confirmDialog({
        title: 'Delete destination?',
        message: `Remove "${id}" from the live website. This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
      btn.disabled = true;
      try {
        await dbDeleteDoc(firestorePaths().destinations, id);
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
