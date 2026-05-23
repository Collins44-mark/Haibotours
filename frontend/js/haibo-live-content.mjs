/**
 * Normalize Firestore CMS documents for public site rendering (no static catalog merge).
 */

export function haiboNormalizeFirestoreDestination(doc) {
  if (!doc?.id) return null;
  const cardImage = doc.cardImage || doc.image || doc.imageUrl || '';
  const heroImage = doc.heroImage || doc.hero_image || cardImage || '';
  const isDraft = doc.status === 'draft' || doc.published === false;
  const published = !isDraft && doc.active !== false;

  return {
    ...doc,
    id: String(doc.id).trim(),
    image: cardImage,
    imageUrl: cardImage,
    cardImage,
    heroImage,
    gallery: Array.isArray(doc.gallery) ? doc.gallery : [],
    packages: Array.isArray(doc.packages) ? doc.packages : [],
    highlights: Array.isArray(doc.highlights) ? doc.highlights : [],
    experience: doc.experience && typeof doc.experience === 'object' ? doc.experience : {},
    _fromFirestore: true,
    active: published,
    published,
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
