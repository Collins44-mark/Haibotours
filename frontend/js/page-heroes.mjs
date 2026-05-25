/**
 * Per-page hero banners — Firestore doc pageHeroes/main { pages: { ... } }
 */

export const PAGE_HERO_PAGE_IDS = ['home', 'destinations', 'gallery', 'contact'];

export const PAGE_HERO_META = {
  home: {
    label: 'Home',
    livePath: '/',
    rootSelector: '#home.hero-banner',
    hasCta: true,
  },
  destinations: {
    label: 'Destinations',
    livePath: '/destinations.html',
    rootSelector: '.page-hero.hero-banner',
    hasCta: false,
  },
  gallery: {
    label: 'Gallery',
    livePath: '/gallery.html',
    rootSelector: '.gallery-hero.hero-banner',
    hasCta: false,
  },
  contact: {
    label: 'Contact',
    livePath: '/contact.html',
    rootSelector: '.contact-hero.hero-banner',
    hasCta: false,
  },
};

export function defaultPageHeroPages() {
  return {
    home: {
      eyebrow: 'Explore Tanzania',
      title: 'Discover the soul of',
      titleAccent: 'Tanzania',
      subtitle:
        'Authentic safaris, luxury adventures, cultural journeys and unforgettable wildlife experiences across East Africa.',
      backgroundImageUrl: '',
      ctaPrimaryText: 'Explore Safaris',
      ctaPrimaryLink: 'destinations.html',
      ctaSecondaryText: 'View Gallery',
      ctaSecondaryLink: 'gallery.html',
    },
    destinations: {
      eyebrow: 'Explore Tanzania',
      title: 'All Safari',
      titleAccent: 'Destinations',
      subtitle:
        'Select a destination to view packages, expert guides, photo galleries, and pricing — then book directly via WhatsApp.',
      backgroundImageUrl: '',
    },
    gallery: {
      eyebrow: 'Guest Moments',
      title: 'Safari',
      titleAccent: 'Gallery',
      subtitle:
        'Photos and videos from real HAIBO adventures — wildlife, beaches, treks, and unforgettable guest experiences across Tanzania.',
      backgroundImageUrl: '',
    },
    contact: {
      eyebrow: 'Get In Touch',
      title: "Let's Plan Your",
      titleAccent: 'Safari',
      subtitle:
        'Reach our team in Arusha for custom itineraries, group bookings, and travel advice across Tanzania.',
      backgroundImageUrl: '',
    },
  };
}

export function emptyPageHeroesDoc() {
  return { pages: defaultPageHeroPages(), updatedAt: 0 };
}

/** Merge legacy hero/main doc into pageHeroes.pages.home */
export function normalizePageHeroesDoc(raw, legacyHero) {
  const base = emptyPageHeroesDoc();
  const pages = { ...base.pages, ...(raw?.pages || {}) };
  if (legacyHero && typeof legacyHero === 'object') {
    pages.home = { ...base.pages.home, ...pages.home, ...legacyHero };
  }
  PAGE_HERO_PAGE_IDS.forEach((id) => {
    pages[id] = { ...base.pages[id], ...(pages[id] || {}) };
  });
  return {
    pages,
    updatedAt: raw?.updatedAt || legacyHero?.updatedAt || 0,
  };
}

export function getPageHeroForSite(pageId, content) {
  const pages = content?.pageHeroes?.pages || {};
  if (pageId === 'home') {
    return { ...(content?.hero || {}), ...pages.home };
  }
  return pages[pageId] || null;
}

export function detectSitePageId() {
  const page = document.body?.dataset?.page;
  if (page && PAGE_HERO_PAGE_IDS.includes(page)) return page;
  return null;
}
