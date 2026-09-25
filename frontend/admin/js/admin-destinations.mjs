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

/** Allocate a unique URL slug for a NEW destination (never used to rename existing). */
export function allocateUniqueDestinationId(name, existingIds = []) {
  const base = slugify(name) || 'destination';
  const taken = new Set(
    (existingIds || []).map((id) => destinationIdKey(id)).filter(Boolean)
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function formatDestinationPrice(rawPrice, currency = 'USD') {
  const raw = String(rawPrice || '').trim();
  if (!raw) return '';
  if (/^[€$£]/.test(raw) || /USD|EUR|TZS/i.test(raw)) return raw;
  const num = raw.replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(num)) return raw;
  const formatted = Number(num).toLocaleString('en-US');
  if (currency === 'EUR') return `€${formatted}`;
  if (currency === 'TZS') return `TZS ${formatted}`;
  return `$${formatted}`;
}

function parsePriceFieldsFromDestination(data = {}) {
  const pkg =
    (Array.isArray(data.packages) &&
      (data.packages.find((p) => p?.popular) || data.packages[0])) ||
    null;
  let price = String(data.price || pkg?.price || '').trim();
  let currency = String(data.currency || 'USD').trim() || 'USD';
  const note = String(data.priceNote || data.priceType || pkg?.priceNote || 'per person')
    .replace(/^·\s*/, '')
    .trim();

  if (/^\$/.test(price)) {
    currency = 'USD';
    price = price.replace(/^\$\s*/, '');
  } else if (/^€/.test(price)) {
    currency = 'EUR';
    price = price.replace(/^€\s*/, '');
  } else if (/^TZS\s*/i.test(price)) {
    currency = 'TZS';
    price = price.replace(/^TZS\s*/i, '');
  }

  let priceType = 'per person';
  if (/group/i.test(note)) priceType = 'per group';
  else if (/request/i.test(note)) priceType = 'on request';
  else if (/per person/i.test(note)) priceType = 'per person';
  else if (note) priceType = note;

  return {
    duration: String(data.duration || pkg?.duration || '').trim(),
    price,
    currency,
    priceType,
  };
}

/** Keep legacy packages[] in sync with destination-level price/duration (single source). */
function syncPreferredPackage(existingPackages, details) {
  const pkgs = Array.isArray(existingPackages)
    ? existingPackages.map((p) => ({ ...p }))
    : [];
  const price = formatDestinationPrice(details.price, details.currency);
  const priceNote = details.priceType || 'per person';
  const duration = details.duration || '';
  const features = Array.isArray(details.included) ? details.included : [];

  if (!pkgs.length) {
    if (!price && !duration && !features.length) return [];
    return [
      {
        name: details.name || 'Safari Package',
        duration,
        price,
        priceNote,
        features,
        popular: true,
      },
    ];
  }

  const idx = Math.max(
    0,
    pkgs.findIndex((p) => p?.popular)
  );
  const target = idx >= 0 && pkgs[idx] ? idx : 0;
  pkgs[target] = {
    ...pkgs[target],
    duration: duration || pkgs[target].duration || '',
    price: price || pkgs[target].price || '',
    priceNote: priceNote || pkgs[target].priceNote || 'per person',
    popular: true,
  };
  if (features.length && !(pkgs[target].features || []).length) {
    pkgs[target].features = features;
  }
  return pkgs;
}

export function collectDestinationPayload(form, builders, options = {}) {
  const name = form.querySelector('[name="name"]')?.value?.trim() || '';
  const lockedId = String(options.lockedId || form.dataset.editId || '').trim();
  const slugInput = form.querySelector('[name="id"]');
  let id = lockedId
    ? slugify(lockedId)
    : slugify(slugInput?.value?.trim() || '') || slugify(name);

  if (!lockedId && options.allocateUnique && typeof options.allocateUnique === 'function') {
    id = options.allocateUnique(name);
  }

  const publishStatus = form.querySelector('[name="publishStatus"]')?.value || 'published';
  const published = publishStatus === 'published';
  const duration = form.querySelector('[name="duration"]')?.value?.trim() || '';
  const priceRaw = form.querySelector('[name="price"]')?.value?.trim() || '';
  const currency = form.querySelector('[name="currency"]')?.value?.trim() || 'USD';
  const priceType = form.querySelector('[name="priceType"]')?.value?.trim() || 'per person';
  const overview = form.querySelector('[name="overview"]')?.value?.trim() || '';
  const subtitle = form.querySelector('[name="subtitle"]')?.value?.trim() || '';
  const included = builders.included?.getValues?.() ?? [];
  const preservedPackages = options.preservedPackages || builders.packages?.getValues?.() || [];
  const packages = syncPreferredPackage(preservedPackages, {
    name,
    duration,
    price: priceRaw,
    currency,
    priceType,
    included,
  });

  return {
    id,
    name,
    subtitle,
    region: form.querySelector('[name="region"]')?.value?.trim() || '',
    image: form.querySelector('[name="image"]')?.value?.trim() || '',
    imageUrl: form.querySelector('[name="image"]')?.value?.trim() || '',
    cardImage: form.querySelector('[name="image"]')?.value?.trim() || '',
    heroImage:
      form.querySelector('[name="heroImage"]')?.value?.trim() ||
      form.querySelector('[name="image"]')?.value?.trim() ||
      '',
    description: overview,
    overview,
    bestTime: form.querySelector('[name="bestTime"]')?.value?.trim() || '',
    duration,
    price: formatDestinationPrice(priceRaw, currency),
    currency,
    priceNote: priceType,
    priceType,
    highlights: subtitle
      ? subtitle
          .split(/[,&]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    gallery: builders.gallery?.getValues?.() ?? [],
    packages,
    experience: options.preservedExperience || builders.experience?.getValues?.() || {},
    included,
    excluded: builders.excluded?.getValues?.() ?? [],
    itinerary: builders.itinerary?.getValues?.() ?? [],
    importantInfo: builders.importantInfo?.getValues?.() ?? [],
    mapUrl: form.querySelector('[name="mapUrl"]')?.value?.trim() || '',
    mapQuery: form.querySelector('[name="mapQuery"]')?.value?.trim() || '',
    startingPoint: form.querySelector('[name="startingPoint"]')?.value?.trim() || '',
    endingPoint: form.querySelector('[name="endingPoint"]')?.value?.trim() || '',
    groupSize: form.querySelector('[name="groupSize"]')?.value?.trim() || '',
    tourType: form.querySelector('[name="tourType"]')?.value?.trim() || '',
    difficulty: form.querySelector('[name="difficulty"]')?.value?.trim() || '',
    importantNotes: form.querySelector('[name="importantNotes"]')?.value?.trim() || '',
    seoTitle: form.querySelector('[name="seoTitle"]')?.value?.trim() || '',
    metaDescription: form.querySelector('[name="metaDescription"]')?.value?.trim() || '',
    active: published,
    published,
    order: Number(form.querySelector('[name="order"]')?.value) || 0,
    status: publishStatus,
  };
}

export { parsePriceFieldsFromDestination, formatDestinationPrice };

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
