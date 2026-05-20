/**
 * HAIBO — local fallback content when Firestore is empty or unavailable.
 * Admin uploads merge on top; empty fields never wipe the public site.
 */
const HAIBO_DEFAULTS = {
  hero: {
    eyebrow: 'Explore Tanzania',
    title: 'Discover the soul of',
    titleAccent: 'Tanzania',
    subtitle:
      'Authentic safaris, luxury adventures, cultural journeys and unforgettable wildlife experiences across East Africa.',
    backgroundImageUrl:
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2070&auto=format&fit=crop',
    ctaPrimaryText: 'Explore Safaris',
    ctaPrimaryLink: 'destinations.html',
    ctaSecondaryText: 'View Gallery',
    ctaSecondaryLink: 'gallery.html',
    homeCta: {
      eyebrow: 'Start Your Journey',
      title: 'Start Your Tanzania Adventure',
      body: "Ready to explore? Contact us today and we'll craft the perfect safari itinerary for you.",
      backgroundClass: 'cta-bg-kili',
    },
  },
  about: {
    eyebrow: 'Why Choose Us',
    title: 'Unforgettable Journeys Crafted For You',
    body: 'Experience premium safari adventures with expert local guides, luxury accommodations, and unforgettable wildlife encounters.',
    imageUrl:
      'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1974&auto=format&fit=crop',
    imageAlt: 'Luxury Tanzania safari experience',
    featureCards: [
      { title: 'SUSTAINABLE TRAVEL', subtitle: '' },
      { title: 'Best price guarantee', subtitle: '' },
      { title: 'Local expertise', subtitle: '' },
      { title: '24/7', subtitle: 'Guest Support' },
    ],
  },
  contact: {
    phoneDisplay: '+255 712 345 678',
    email: 'info@haibotours.com',
    whatsappNumber: '255712345678',
    address: 'Sokoine Road, Arusha, Tanzania',
    officeHours: 'Monday – Saturday: 8:00 AM – 6:00 PM (EAT)',
    mapUrl: 'https://maps.google.com/?q=Arusha+Tanzania',
    defaultTourMessage:
      'Hello HAIBO Tours & Safaris! I would like to inquire about a simple tour package in Tanzania. Please share availability and pricing. Thank you!',
  },
  socials: {
    instagram: 'https://instagram.com/haibotours',
    facebook: 'https://facebook.com/haibotours',
    tiktok: '',
    whatsapp: '',
  },
  settings: {
    logoUrl: 'assets/logo/logo.png',
    brandName: 'HAIBO',
    tagline: 'TOURS & SAFARIS',
    destinationsSection: { eyebrow: 'Explore Tanzania', title: 'Popular Destinations' },
    gallerySection: { eyebrow: 'Gallery', title: 'Experience Tanzania' },
    footer: {
      brand: 'HAIBO',
      description:
        'Luxury safari experiences crafted for explorers seeking unforgettable adventures in Tanzania.',
      copyright: '© 2026 HAIBO Tours & Safaris',
      quickLinks: [
        { label: 'About Us', href: '#about' },
        { label: 'Destinations', href: 'destinations.html' },
        { label: 'Gallery', href: 'gallery.html' },
        { label: 'Safaris', href: '#safaris' },
        { label: 'Contact', href: 'contact.html' },
      ],
    },
    navLinks: [
      { label: 'Home', href: '#home' },
      { label: 'About', href: '#about' },
      { label: 'Safaris', href: '#safaris' },
      { label: 'Destinations', href: 'destinations.html' },
      { label: 'Gallery', href: 'gallery.html' },
      { label: 'Contact', href: 'contact.html' },
    ],
  },
};

function haiboDocHasContent(doc, requiredKeys) {
  if (!doc || typeof doc !== 'object') return false;
  return requiredKeys.some((k) => doc[k] != null && String(doc[k]).trim() !== '');
}

/** True when URL is usable for img/background (http, path, or site asset) */
function haiboValidMediaUrl(url) {
  if (url == null) return false;
  const s = String(url).trim();
  if (s.length < 8) return false;
  return (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('/') ||
    s.startsWith('assets/')
  );
}

/** Only real admin uploads override built-in Unsplash defaults */
function haiboIsAdminUploadedUrl(url) {
  if (!haiboValidMediaUrl(url)) return false;
  const s = String(url).toLowerCase();
  return s.includes('res.cloudinary.com') || s.includes('/image/upload/');
}

function haiboNormalizeDestId(id) {
  return String(id || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function haiboStaticDestination(id) {
  const key = haiboNormalizeDestId(id);
  const list = window.HAIBO_DESTINATIONS_STATIC || [];
  return list.find((d) => haiboNormalizeDestId(d.id) === key) || null;
}

function haiboPickDestinationImage(d) {
  if (!d) return '';
  return d.image || d.imageUrl || d.cardImage || d.thumbnail || '';
}

function haiboMergeDestination(live, staticDest) {
  const base = staticDest ? { ...staticDest } : {};
  const merged = { ...base, ...live };

  const liveImage = haiboPickDestinationImage(live);
  const liveHero = live?.heroImage || live?.hero_image || '';
  const baseImage = base.image || haiboPickDestinationImage(base);
  merged.image = haiboIsAdminUploadedUrl(liveImage) ? liveImage : baseImage;
  merged.heroImage = haiboIsAdminUploadedUrl(liveHero)
    ? liveHero
    : base.heroImage || baseImage || merged.image;

  if (!Array.isArray(merged.packages) || !merged.packages.length) {
    merged.packages = base.packages || [];
  }
  const liveGallery = merged.gallery || merged.galleryImages;
  if (!Array.isArray(liveGallery) || !liveGallery.length) {
    merged.gallery = base.gallery || [];
  } else {
    merged.gallery = liveGallery;
  }
  delete merged.galleryImages;

  if (!Array.isArray(merged.highlights) || !merged.highlights.length) {
    merged.highlights = base.highlights || [];
  }
  if (!merged.experience && base.experience) {
    merged.experience = base.experience;
  }
  if (!merged.description && base.description) merged.description = base.description;
  if (!merged.bestTime && base.bestTime) merged.bestTime = base.bestTime;
  if (!merged.region && base.region) merged.region = base.region;
  if (!merged.subtitle && base.subtitle) merged.subtitle = base.subtitle;
  if (!merged.name && base.name) merged.name = base.name;
  if (merged.id == null || String(merged.id).trim() === '') {
    merged.id = base.id || live?.id;
  }
  merged.id = haiboNormalizeDestId(merged.id) || merged.id;

  return merged;
}

/** Always show the full static catalog; Firestore only overrides fields with real content */
function haiboMergeDestinationsList(liveItems) {
  const staticList =
    window.HAIBO_DESTINATIONS_STATIC ||
    (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS.map((x) => ({ ...x })) : []);
  if (!staticList.length) return [];

  const active = (liveItems || []).filter((d) => d && d.active !== false);
  const liveById = new Map();
  active.forEach((d) => {
    const key = haiboNormalizeDestId(d.id);
    if (key) liveById.set(key, d);
  });

  const merged = staticList.map((staticD, index) => {
    const key = haiboNormalizeDestId(staticD.id);
    const live = liveById.get(key);
    if (live) liveById.delete(key);
    const row = live ? haiboMergeDestination(live, staticD) : { ...staticD };
    if (row.order == null) row.order = index;
    return row;
  });

  liveById.forEach((live) => {
    const key = haiboNormalizeDestId(live.id);
    if (!key) return;
    merged.push(haiboMergeDestination(live, haiboStaticDestination(key)));
  });

  return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function haiboValidGalleryItem(item) {
  return haiboValidMediaUrl(item?.src || item?.url);
}

function haiboDefaultGallery() {
  return {
    images: typeof GALLERY_IMAGES !== 'undefined' ? [...GALLERY_IMAGES] : [],
    videos: typeof GALLERY_VIDEOS !== 'undefined' ? [...GALLERY_VIDEOS] : [],
  };
}

/** Merge Firestore gallery collection docs with local GALLERY_* defaults */
function haiboMergeGalleryCollection(items) {
  const defaults = haiboDefaultGallery();
  const list = items || [];
  const images = list
    .filter((g) => (g.type === 'image' || !g.type) && g.active !== false)
    .filter((g) => haiboIsAdminUploadedUrl(g.src || g.url))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const videos = list
    .filter((g) => g.type === 'video' && g.active !== false)
    .filter((g) => haiboIsAdminUploadedUrl(g.src))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    images: images.length ? images : defaults.images,
    videos: videos.length ? videos : defaults.videos,
  };
}

function haiboNormalizeGalleryObject(gallery) {
  const defaults = haiboDefaultGallery();
  const images = (gallery?.images || []).filter((img) =>
    haiboIsAdminUploadedUrl(img.src || img.url)
  );
  const videos = (gallery?.videos || []).filter((g) => haiboIsAdminUploadedUrl(g.src));
  return {
    images: images.length ? images : defaults.images,
    videos: videos.length ? videos : defaults.videos,
  };
}

function mergeHaiboContentWithDefaults() {
  const c = window.HAIBO_CONTENT;
  const d = typeof HAIBO_DEFAULTS !== 'undefined' ? HAIBO_DEFAULTS : {};

  c.hero = { ...d.hero, ...(c.hero || {}) };
  if (!haiboValidMediaUrl(c.hero.backgroundImageUrl)) {
    c.hero.backgroundImageUrl = d.hero.backgroundImageUrl;
  }

  c.about = { ...d.about, ...(c.about || {}) };
  if (!haiboValidMediaUrl(c.about.imageUrl)) {
    c.about.imageUrl = d.about.imageUrl;
  }

  if (!haiboDocHasContent(c.contact, ['email', 'phoneDisplay'])) {
    c.contact = { ...d.contact, ...(c.contact || {}), ...(typeof HAIBO_CONFIG !== 'undefined' ? HAIBO_CONFIG : {}) };
  }

  if (!haiboDocHasContent(c.socials, ['instagram', 'facebook'])) {
    c.socials = { ...d.socials, ...(c.socials || {}) };
  }

  c.settings = { ...d.settings, ...(c.settings || {}) };
  if (!haiboValidMediaUrl(c.settings.logoUrl)) {
    c.settings.logoUrl = d.settings.logoUrl;
  }

  c.destinations = haiboMergeDestinationsList(c.destinations);
  c.gallery = haiboNormalizeGalleryObject(c.gallery);

  if (!Array.isArray(c.weatherCards) || c.weatherCards.length === 0) {
    c.weatherCards =
      typeof WEATHER_PARKS_STATIC !== 'undefined'
        ? WEATHER_PARKS_STATIC.map((p) => ({ ...p, active: true }))
        : [];
  }

  if (!c.settings?.searchEnabledIds?.length && c.destinations?.length) {
    if (!c.settings) c.settings = {};
    c.settings.searchEnabledIds = c.destinations.map((x) => x.id);
  }
}

window.HAIBO_DEFAULTS = HAIBO_DEFAULTS;
window.mergeHaiboContentWithDefaults = mergeHaiboContentWithDefaults;
window.haiboValidMediaUrl = haiboValidMediaUrl;
window.haiboIsAdminUploadedUrl = haiboIsAdminUploadedUrl;
window.haiboMergeDestinationsList = haiboMergeDestinationsList;
window.haiboMergeGalleryCollection = haiboMergeGalleryCollection;
window.haiboNormalizeGalleryObject = haiboNormalizeGalleryObject;
window.haiboStaticDestination = haiboStaticDestination;
window.haiboPickDestinationImage = haiboPickDestinationImage;
window.haiboNormalizeDestId = haiboNormalizeDestId;
