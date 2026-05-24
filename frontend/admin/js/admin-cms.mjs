/**
 * Admin CMS — in-memory copy synced to Cloudinary on every save (live website reads the same JSON).
 */
import { emptyCmsDocument, fetchSiteCms, uploadSiteCms } from '../../js/cms-cloudinary.mjs';
import { adminToast } from './admin-db.mjs';

window.HAIBO_ADMIN_CMS = emptyCmsDocument();

export function getAdminCms() {
  return window.HAIBO_ADMIN_CMS;
}

export async function loadAdminCms() {
  const remote = await fetchSiteCms();
  if (remote) {
    const current = getAdminCms();
    window.HAIBO_ADMIN_CMS = {
      ...emptyCmsDocument(),
      ...current,
      ...remote,
      destinations: remote.destinations ?? current.destinations ?? [],
      gallery: remote.gallery ?? current.gallery ?? [],
      weatherCards: remote.weatherCards ?? current.weatherCards ?? [],
    };
  }
  return window.HAIBO_ADMIN_CMS;
}

/** Push current admin CMS to Cloudinary — website picks it up automatically. */
export async function syncCmsToWebsite(options = {}) {
  const { quiet = false } = options;
  const cms = getAdminCms();

  try {
    const saved = await uploadSiteCms(cms);
    const { _deliveryUrl, ...rest } = saved;
    window.HAIBO_ADMIN_CMS = {
      ...emptyCmsDocument(),
      ...cms,
      ...rest,
    };
    if (!quiet) {
      adminToast('Saved — live website updated', 'success');
    }
    return window.HAIBO_ADMIN_CMS;
  } catch (err) {
    const msg = err?.message || 'Could not save to the website';
    if (!quiet) {
      adminToast(msg, 'error');
    }
    throw err;
  }
}

export function upsertDestinationInCms(row) {
  const cms = getAdminCms();
  const id = String(row.id).trim();
  const list = [...(cms.destinations || [])];
  const idx = list.findIndex((d) => d.id === id);
  const entry = { ...row, id, slug: id, updatedAt: Date.now() };
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  cms.destinations = list;
  return entry;
}

export function removeDestinationFromCms(id) {
  const cms = getAdminCms();
  cms.destinations = (cms.destinations || []).filter((d) => d.id !== id);
}

export function getDestinationFromCms(id) {
  return (getAdminCms().destinations || []).find((d) => d.id === id) || null;
}

export function listDestinationsForAdmin() {
  return [...(getAdminCms().destinations || [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
}
