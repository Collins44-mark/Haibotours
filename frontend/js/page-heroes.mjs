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

/** Merge pageHeroes/main and/or hero/main (flat home fields + optional pages map). */
export function normalizePageHeroesDoc(raw, legacyHero) {
  const base = emptyPageHeroesDoc();
  const fromHero =
    legacyHero?.pages && typeof legacyHero.pages === 'object'
      ? { pages: { ...legacyHero.pages }, updatedAt: legacyHero.updatedAt }
      : null;
  const source = raw || fromHero;
  const pages = { ...base.pages, ...(source?.pages || {}) };

  if (legacyHero && typeof legacyHero === 'object') {
    const { pages: embedded, updatedAt: _u, ...homeFlat } = legacyHero;
    if (embedded && typeof embedded === 'object') {
      PAGE_HERO_PAGE_IDS.forEach((id) => {
        pages[id] = { ...base.pages[id], ...pages[id], ...(embedded[id] || {}) };
      });
    }
    pages.home = { ...base.pages.home, ...pages.home, ...homeFlat };
  }

  PAGE_HERO_PAGE_IDS.forEach((id) => {
    pages[id] = { ...base.pages[id], ...(pages[id] || {}) };
  });

  return {
    pages,
    updatedAt: raw?.updatedAt || legacyHero?.updatedAt || 0,
  };
}

/** Single Firestore write to hero/main (works without pageHeroes collection in rules). */
export function heroFirestorePayloadFromPageHeroes(doc) {
  const home = doc?.pages?.home || {};
  return {
    ...home,
    pages: doc.pages,
    updatedAt: doc.updatedAt || Date.now(),
  };
}

export function getPageHeroForSite(pageId, content) {
  const pages = content?.pageHeroes?.pages || content?.hero?.pages || {};
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
