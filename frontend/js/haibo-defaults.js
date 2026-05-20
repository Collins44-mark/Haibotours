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

function haiboStaticDestination(id) {
  const list = window.HAIBO_DESTINATIONS_STATIC || [];
  return list.find((d) => d.id === id) || null;
}

function haiboMergeDestination(live, staticDest) {
  const base = staticDest ? { ...staticDest } : {};
  const merged = { ...base, ...live };
  if (!haiboValidMediaUrl(merged.image)) merged.image = base.image || merged.image;
  if (!haiboValidMediaUrl(merged.heroImage)) {
    merged.heroImage = base.heroImage || base.image || merged.heroImage;
  }
  if (!Array.isArray(merged.packages) || !merged.packages.length) {
    merged.packages = base.packages || [];
  }
  if (!Array.isArray(merged.galleryImages) || !merged.galleryImages.length) {
    merged.galleryImages = base.galleryImages || [];
  }
  if (!Array.isArray(merged.experiences) || !merged.experiences.length) {
    merged.experiences = base.experiences || [];
  }
  return merged;
}

function haiboMergeDestinationsList(liveItems) {
  const staticList =
    window.HAIBO_DESTINATIONS_STATIC ||
    (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS.map((x) => ({ ...x })) : []);
  const active = (liveItems || []).filter((d) => d && d.id && d.active !== false);
  if (!active.length) return staticList.map((x) => ({ ...x }));

  const staticById = Object.fromEntries(staticList.map((d) => [d.id, d]));
  const merged = active
    .map((d) => haiboMergeDestination(d, staticById[d.id]))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const withCardImages = merged.filter((d) => haiboValidMediaUrl(d.image));
  return withCardImages.length ? merged : staticList.map((x) => ({ ...x }));
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
    .filter(haiboValidGalleryItem)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const videos = list
    .filter((g) => g.type === 'video' && g.active !== false)
    .filter((g) => haiboValidMediaUrl(g.src))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    images: images.length ? images : defaults.images,
    videos: videos.length ? videos : defaults.videos,
  };
}

function haiboNormalizeGalleryObject(gallery) {
  const defaults = haiboDefaultGallery();
  const images = (gallery?.images || []).filter(haiboValidGalleryItem);
  const videos = (gallery?.videos || []).filter((g) => haiboValidMediaUrl(g.src));
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
window.haiboMergeDestinationsList = haiboMergeDestinationsList;
window.haiboMergeGalleryCollection = haiboMergeGalleryCollection;
window.haiboNormalizeGalleryObject = haiboNormalizeGalleryObject;
window.haiboStaticDestination = haiboStaticDestination;
