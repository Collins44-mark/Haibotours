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

function mergeHaiboContentWithDefaults() {
  const c = window.HAIBO_CONTENT;
  const d = typeof HAIBO_DEFAULTS !== 'undefined' ? HAIBO_DEFAULTS : {};

  if (!haiboDocHasContent(c.hero, ['title', 'backgroundImageUrl'])) {
    c.hero = { ...d.hero, ...(c.hero || {}) };
    if (!c.hero.backgroundImageUrl) c.hero.backgroundImageUrl = d.hero.backgroundImageUrl;
    if (!c.hero.title) c.hero.title = d.hero.title;
  }

  if (!haiboDocHasContent(c.about, ['title', 'body'])) {
    c.about = { ...d.about, ...(c.about || {}) };
  }

  if (!haiboDocHasContent(c.contact, ['email', 'phoneDisplay'])) {
    c.contact = { ...d.contact, ...(c.contact || {}), ...(typeof HAIBO_CONFIG !== 'undefined' ? HAIBO_CONFIG : {}) };
  }

  if (!haiboDocHasContent(c.socials, ['instagram', 'facebook'])) {
    c.socials = { ...d.socials, ...(c.socials || {}) };
  }

  if (!haiboDocHasContent(c.settings, ['brandName', 'logoUrl'])) {
    c.settings = { ...d.settings, ...(c.settings || {}) };
  }

  const staticDests =
    window.HAIBO_DESTINATIONS_STATIC ||
    (typeof DESTINATIONS !== 'undefined' ? DESTINATIONS.map((x) => ({ ...x })) : []);
  const activeDests = (c.destinations || []).filter((d) => d && d.id && d.active !== false);
  if (!Array.isArray(c.destinations) || activeDests.length === 0) {
    c.destinations = staticDests.map((x) => ({ ...x }));
  }

  const hasGallery =
    (c.gallery?.images?.length || 0) > 0 || (c.gallery?.videos?.length || 0) > 0;
  if (!hasGallery) {
    c.gallery = {
      images: typeof GALLERY_IMAGES !== 'undefined' ? [...GALLERY_IMAGES] : [],
      videos: typeof GALLERY_VIDEOS !== 'undefined' ? [...GALLERY_VIDEOS] : [],
    };
  }

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
