/**
 * Default package inclusions/exclusions template.
 * Stored on settings.packageTemplate; seeded from the reference destination when empty.
 */
import { getAdminCms, saveSectionToFirestore, listDestinationsForAdmin } from './admin-cms.mjs';
import { mergeDestinationsForAdmin } from './admin-destinations.mjs';

/** Last-resort defaults only when no destination/template data exists yet. */
const FALLBACK_INCLUDED = [
  'Park fees',
  'Professional driver/guide',
  '4x4 safari vehicle',
  'Accommodation',
  'All meals',
  'Drinking water',
  'Airport transfers',
  'Government taxes / VAT',
];

const FALLBACK_EXCLUDED = [
  'International flights',
  'Tanzania visa fees',
  'Travel insurance',
  'Personal expenses',
  'Tips',
  'Optional activities',
];

function toItemString(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item.trim();
  const title = String(item.title || item.label || item.name || '').trim();
  const detail = String(item.detail || item.text || item.description || '').trim();
  if (title && detail) return `${title} — ${detail}`;
  return title || detail;
}

export function normalizeTemplateList(items) {
  const out = [];
  (items || []).forEach((item) => {
    const text = toItemString(item);
    if (text && !out.includes(text)) out.push(text);
  });
  return out;
}

export function copyPackageTemplate(template = {}) {
  return {
    included: normalizeTemplateList(template.included),
    excluded: normalizeTemplateList(template.excluded),
  };
}

/** Prefer the live "6 Days Best Northern Tanzania Safari" (or closest match) as the seed source. */
export function findReferencePackageDestination(destinations) {
  const list = Array.isArray(destinations) ? destinations : [];
  if (!list.length) return null;

  const score = (d) => {
    const id = String(d?.id || '').toLowerCase();
    const name = String(d?.name || '').toLowerCase();
    let s = 0;
    if (/best.?northern|northern.?tanzania.?safari|6.?days.?best/.test(id)) s += 8;
    if (/best northern tanzania|6 days best northern/.test(name)) s += 10;
    if (/northern/.test(name) && /safari/.test(name)) s += 3;
    if (/6\s*days/.test(name)) s += 2;
    if (Array.isArray(d?.included) && d.included.length) s += 4;
    if (Array.isArray(d?.excluded) && d.excluded.length) s += 3;
    const pkg =
      (Array.isArray(d?.packages) && (d.packages.find((p) => p?.popular) || d.packages[0])) || null;
    if (Array.isArray(pkg?.features) && pkg.features.length) s += 2;
    return s;
  };

  return [...list].sort((a, b) => score(b) - score(a))[0] || null;
}

export function extractInclusionsFromDestination(dest) {
  if (Array.isArray(dest?.included) && dest.included.length) {
    return normalizeTemplateList(dest.included);
  }
  const pkg =
    (Array.isArray(dest?.packages) &&
      (dest.packages.find((p) => p?.popular) || dest.packages[0])) ||
    null;
  return normalizeTemplateList(pkg?.features || []);
}

export function extractExclusionsFromDestination(dest) {
  if (Array.isArray(dest?.excluded) && dest.excluded.length) {
    return normalizeTemplateList(dest.excluded);
  }
  return [];
}

function destinationsPool() {
  try {
    const merged = mergeDestinationsForAdmin();
    if (merged?.length) return merged;
  } catch {
    /* ignore */
  }
  return listDestinationsForAdmin() || getAdminCms()?.destinations || [];
}

/**
 * Resolve the current default template.
 * Prefer settings.packageTemplate; otherwise seed from the reference destination (copy, not live link).
 */
export function resolvePackageTemplate(options = {}) {
  const cms = getAdminCms();
  const stored = cms?.settings?.packageTemplate;
  const included = normalizeTemplateList(stored?.included);
  const excluded = normalizeTemplateList(stored?.excluded);

  if (included.length || excluded.length) {
    return {
      included: included.length ? included : [...FALLBACK_INCLUDED],
      excluded: excluded.length ? excluded : [...FALLBACK_EXCLUDED],
      source: stored?.sourceDestinationId || 'settings',
      fromSettings: true,
    };
  }

  const ref = findReferencePackageDestination(destinationsPool());
  const fromRefIncluded = extractInclusionsFromDestination(ref);
  const fromRefExcluded = extractExclusionsFromDestination(ref);

  return {
    included: fromRefIncluded.length ? fromRefIncluded : [...FALLBACK_INCLUDED],
    excluded: fromRefExcluded.length ? fromRefExcluded : [...FALLBACK_EXCLUDED],
    source: ref?.id || 'fallback',
    fromSettings: false,
    referenceDestination: ref || null,
  };
}

/** Persist template into settings if missing, using reference destination data when available. */
export async function ensurePackageTemplateSeeded() {
  const cms = getAdminCms();
  const existing = cms?.settings?.packageTemplate;
  if (
    normalizeTemplateList(existing?.included).length ||
    normalizeTemplateList(existing?.excluded).length
  ) {
    return copyPackageTemplate(existing);
  }

  const resolved = resolvePackageTemplate();
  const packageTemplate = {
    included: [...resolved.included],
    excluded: [...resolved.excluded],
    sourceDestinationId: resolved.referenceDestination?.id || resolved.source || '',
    updatedAt: Date.now(),
  };

  cms.settings = {
    ...(cms.settings || {}),
    packageTemplate,
    updatedAt: Date.now(),
  };

  try {
    await saveSectionToFirestore('settings', cms.settings);
  } catch (err) {
    console.warn('[HAIBO] Could not persist package template seed', err);
  }

  return copyPackageTemplate(packageTemplate);
}

export async function savePackageTemplate({ included, excluded }) {
  const cms = getAdminCms();
  const packageTemplate = {
    included: normalizeTemplateList(included),
    excluded: normalizeTemplateList(excluded),
    sourceDestinationId: cms.settings?.packageTemplate?.sourceDestinationId || 'manual',
    updatedAt: Date.now(),
  };
  cms.settings = {
    ...(cms.settings || {}),
    packageTemplate,
    updatedAt: Date.now(),
  };
  await saveSectionToFirestore('settings', cms.settings);
  return copyPackageTemplate(packageTemplate);
}

/** Deep-copied defaults for a brand-new destination document. */
export function defaultsForNewDestination() {
  return copyPackageTemplate(resolvePackageTemplate());
}
