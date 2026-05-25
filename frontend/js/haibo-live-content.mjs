/**
 * Normalize Firestore CMS documents for public site rendering (no static catalog merge).
 */

function sanitizeUrl(url) {
  if (typeof globalThis.haiboSanitizeCmsMediaUrl === 'function') {
    return globalThis.haiboSanitizeCmsMediaUrl(url);
  }
  const s = String(url || '').trim();
  return s.includes('res.cloudinary.com') ? s : '';
}

export function haiboNormalizeFirestoreDestination(doc) {
  if (!doc?.id) return null;
  const cardImage = sanitizeUrl(doc.cardImage || doc.image || doc.imageUrl || '');
  const heroImage = sanitizeUrl(doc.heroImage || doc.hero_image || '') || cardImage;
  const id = String(doc.id).trim().toLowerCase().replace(/\s+/g, '-');
  const showOnSite = doc.active !== false && doc.status !== 'draft';

  return {
    ...doc,
    id,
    slug: id,
    image: cardImage,
    imageUrl: cardImage,
    cardImage,
    heroImage,
    gallery:
      typeof haiboNormalizeDestinationGallery === 'function'
        ? haiboNormalizeDestinationGallery(doc.gallery)
        : Array.isArray(doc.gallery)
          ? doc.gallery
          : [],
    packages: Array.isArray(doc.packages) ? doc.packages : [],
    highlights: Array.isArray(doc.highlights) ? doc.highlights : [],
    experience: doc.experience && typeof doc.experience === 'object' ? doc.experience : {},
    _fromFirestore: true,
    active: showOnSite,
    published: showOnSite,
    status: showOnSite ? 'published' : 'draft',
    updatedAt: doc.updatedAt || null,
  };
}

export function haiboDestinationsFromFirestoreDocs(items) {
  return (items || [])
    .map((d) => haiboNormalizeFirestoreDestination({ id: d.id, ...d }))
    .filter(Boolean)
    .filter((d) => d.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
