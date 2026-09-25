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
  const showOnSite =
    doc.active !== false && doc.status !== 'draft' && doc.status !== 'archived';

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
    included: Array.isArray(doc.included) ? doc.included : [],
    excluded: Array.isArray(doc.excluded) ? doc.excluded : [],
    itinerary: Array.isArray(doc.itinerary) ? doc.itinerary : [],
    importantInfo: Array.isArray(doc.importantInfo) ? doc.importantInfo : [],
    overview: String(doc.overview || doc.description || '').trim(),
    mapUrl: String(doc.mapUrl || doc.mapEmbed || '').trim(),
    mapQuery: String(doc.mapQuery || '').trim(),
    duration: String(doc.duration || '').trim(),
    price: String(doc.price || '').trim(),
    currency: String(doc.currency || 'USD').trim() || 'USD',
    priceNote: String(doc.priceNote || doc.priceType || '').trim(),
    priceType: String(doc.priceType || doc.priceNote || '').trim(),
    seoTitle: String(doc.seoTitle || '').trim(),
    metaDescription: String(doc.metaDescription || '').trim(),
    startingPoint: String(doc.startingPoint || '').trim(),
    endingPoint: String(doc.endingPoint || '').trim(),
    groupSize: String(doc.groupSize || '').trim(),
    tourType: String(doc.tourType || '').trim(),
    difficulty: String(doc.difficulty || '').trim(),
    importantNotes: String(doc.importantNotes || '').trim(),
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
