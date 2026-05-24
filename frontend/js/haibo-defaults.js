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

function haiboIsCmsLive(live) {
  return Boolean(live && (live._fromFirestore || live.updatedAt != null));
}

/** Bust browser cache when admin replaces an image (same path, new file). */
function haiboCacheBustUrl(url, version) {
  if (!url || version == null) return url || '';
  const sep = String(url).includes('?') ? '&' : '?';
  return `${url}${sep}cms=${version}`;
}

/** Card/listing image for a destination (Firestore URLs only). */
function haiboResolveCardImage(dest) {
  if (!dest) return '';
  const img = haiboPickDestinationImage(dest) || dest?.heroImage || '';
  if (!haiboValidMediaUrl(img)) return '';
  return haiboCacheBustUrl(img, dest.updatedAt || Date.now());
}

/** Hero banner image for destination detail page (Firestore URLs only). */
function haiboResolveHeroImage(dest) {
  if (!dest) return '';
  const hero = dest?.heroImage || dest?.hero_image || '';
  const card = haiboPickDestinationImage(dest);
  const pick = haiboValidMediaUrl(hero) ? hero : haiboValidMediaUrl(card) ? card : '';
  if (!pick) return '';
  return haiboCacheBustUrl(pick, dest.updatedAt || Date.now());
}

/** Normalize destination gallery: strings or { url, alt, order } objects. */
function haiboNormalizeDestinationGallery(gallery) {
  if (!Array.isArray(gallery)) return [];
  const items = gallery
    .map((item, i) => {
      if (typeof item === 'string') {
        const url = item.trim();
        if (!url) return null;
        return { url, alt: '', order: i };
      }
      const url = String(item?.url || item?.src || '').trim();
      if (!url) return null;
      return {
        url,
        alt: String(item?.alt || item?.title || '').trim(),
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : i,
      };
    })
    .filter(Boolean);
  items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return items.map((it, idx) => ({ ...it, order: idx }));
}

/** Gallery item URL (Firestore URLs only). */
function haiboResolveGalleryImage(item, dest, index) {
  const src =
    typeof item === 'string' ? item : String(item?.url || item?.src || '').trim();
  if (!haiboValidMediaUrl(src)) return '';
  return haiboCacheBustUrl(src, (dest?.updatedAt || 0) + index);
}

function haiboMergeDestination(live, staticDest) {
  const base = staticDest ? { ...staticDest } : {};
  const fromCms = haiboIsCmsLive(live);
  const merged = { ...base, ...live };

  const liveImage = haiboPickDestinationImage(live);
  const liveHero = live?.heroImage || live?.hero_image || '';
  const baseImage = base.image || haiboPickDestinationImage(base);

  if (fromCms) {
    if (Object.prototype.hasOwnProperty.call(live, 'image') || Object.prototype.hasOwnProperty.call(live, 'imageUrl')) {
      merged.image = liveImage || '';
      merged.imageUrl = liveImage || '';
    }
    if (
      Object.prototype.hasOwnProperty.call(live, 'heroImage') ||
      Object.prototype.hasOwnProperty.call(live, 'hero_image')
    ) {
      merged.heroImage = liveHero || liveImage || '';
    } else if (liveImage) {
      merged.heroImage = liveImage;
    }
    merged._fromFirestore = true;
    if (live.updatedAt != null) merged.updatedAt = live.updatedAt;
  } else {
    merged.image = haiboValidMediaUrl(liveImage) ? liveImage : baseImage;
    merged.heroImage = haiboValidMediaUrl(liveHero)
      ? liveHero
      : base.heroImage || baseImage || merged.image;
  }

  if (live && Array.isArray(live.packages)) {
    merged.packages = live.packages;
  } else if (!Array.isArray(merged.packages) || !merged.packages.length) {
    merged.packages = base.packages || [];
  }

  const liveGallery = live?.gallery ?? live?.galleryImages ?? merged.gallery;
  if (live && (Array.isArray(live.gallery) || Array.isArray(live.galleryImages))) {
    merged.gallery = Array.isArray(live.gallery) ? live.gallery : live.galleryImages;
  } else if (!Array.isArray(liveGallery) || !liveGallery.length) {
    merged.gallery = base.gallery || [];
  } else {
    merged.gallery = liveGallery;
  }
  delete merged.galleryImages;
  merged.gallery = haiboNormalizeDestinationGallery(merged.gallery);

  if (live && Array.isArray(live.highlights)) {
    merged.highlights = live.highlights;
  } else if (!Array.isArray(merged.highlights) || !merged.highlights.length) {
    merged.highlights = base.highlights || [];
  }

  if (live?.experience && typeof live.experience === 'object') {
    merged.experience = live.experience;
  } else if (!merged.experience && base.experience) {
    merged.experience = base.experience;
  }

  if (fromCms && live) {
    ['name', 'subtitle', 'description', 'region', 'bestTime'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(live, key)) {
        merged[key] = live[key];
      }
    });
    if (Object.prototype.hasOwnProperty.call(live, 'active')) merged.active = live.active;
    if (Object.prototype.hasOwnProperty.call(live, 'order')) merged.order = live.order;
    if (Array.isArray(live.packages)) merged.packages = live.packages;
    if (Array.isArray(live.highlights)) merged.highlights = live.highlights;
    if (live.experience && typeof live.experience === 'object') merged.experience = live.experience;
    if (Array.isArray(live.gallery)) merged.gallery = live.gallery;
  } else if (live) {
    ['name', 'subtitle', 'description', 'region', 'bestTime'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(live, key) && live[key]) {
        merged[key] = live[key];
      }
    });
    if (Object.prototype.hasOwnProperty.call(live, 'active')) merged.active = live.active;
    if (Object.prototype.hasOwnProperty.call(live, 'order')) merged.order = live.order;
  }
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
    const row = haiboMergeDestination(live, haiboStaticDestination(key));
    row._fromFirestore = true;
    row.active = live.active !== false;
    row.id = key;
    merged.push(row);
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

function haiboGetStaticWeatherParks() {
  return (
    window.WEATHER_PARKS_STATIC ||
    (typeof WEATHER_PARKS_STATIC !== 'undefined' ? WEATHER_PARKS_STATIC : [])
  );
}

function haiboMergeWeatherCard(live, staticPark) {
  const base = staticPark ? { ...staticPark } : {};
  const merged = { ...base, ...live };
  if (merged.lat == null) merged.lat = base.lat;
  if (merged.lon == null) merged.lon = base.lon;
  if (!Array.isArray(merged.facts) || !merged.facts.length) {
    merged.facts = base.facts || [];
  }
  if (!merged.shortName && base.shortName) merged.shortName = base.shortName;
  if (!merged.name && base.name) merged.name = base.name;
  merged.id = haiboNormalizeDestId(merged.id || base.id) || merged.id;
  return merged;
}

/** Always show all default parks; Firestore only overrides when lat/lon are valid */
function haiboMergeWeatherCardsList(liveItems) {
  const staticList = haiboGetStaticWeatherParks();
  if (!staticList.length) return [];

  const active = (liveItems || []).filter((w) => w && w.active !== false);
  const liveById = new Map();
  active.forEach((w) => {
    const key = haiboNormalizeDestId(w.id);
    if (key) liveById.set(key, w);
  });

  const merged = staticList.map((staticP, index) => {
    const key = haiboNormalizeDestId(staticP.id);
    const live = liveById.get(key);
    if (live) liveById.delete(key);
    const row = live ? haiboMergeWeatherCard(live, staticP) : { ...staticP, active: true };
    if (row.order == null) row.order = index;
    return row;
  });

  const hasCoords = (w) => w.lat != null && w.lon != null;
  if (!merged.some(hasCoords)) return staticList.map((p) => ({ ...p, active: true }));

  return merged.filter(hasCoords);
}

function mergeHaiboContentWithDefaults() {
  if (!window.HAIBO_CONTENT) return;
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

  /* Destinations: Firestore only — content-store.mjs sets c.destinations via onSnapshot */
  if (!Array.isArray(c.destinations)) {
    c.destinations = [];
  }
  c.gallery = haiboNormalizeGalleryObject(c.gallery);

  c.weatherCards = haiboMergeWeatherCardsList(c.weatherCards);

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
window.haiboResolveCardImage = haiboResolveCardImage;
window.haiboResolveHeroImage = haiboResolveHeroImage;
window.haiboResolveGalleryImage = haiboResolveGalleryImage;
window.haiboNormalizeDestinationGallery = haiboNormalizeDestinationGallery;
window.haiboCacheBustUrl = haiboCacheBustUrl;
window.haiboIsCmsLive = haiboIsCmsLive;
window.haiboNormalizeDestId = haiboNormalizeDestId;
window.haiboMergeWeatherCardsList = haiboMergeWeatherCardsList;
