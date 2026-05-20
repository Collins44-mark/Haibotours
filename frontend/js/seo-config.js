/**
 * HAIBO SEO — site-wide defaults (update siteUrl for production domain)
 */
const HAIBO_SEO = {
  siteName: 'HAIBO Tours & Safaris',
  /** Canonical base URL (no trailing slash). Override via HAIBO_CONFIG.siteUrl */
  siteUrl: 'https://haibotours.com',
  locale: 'en_TZ',
  language: 'en',
  twitterSite: '@haibotours',
  defaultOgImage: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80&fm=webp',

  business: {
    name: 'HAIBO Tours & Safaris',
    description:
      'Luxury Tanzania safaris, beach escapes, and cultural journeys with expert local guides based in Arusha.',
    telephone: '+255712345678',
    email: 'info@haibotours.com',
    streetAddress: 'Sokoine Road',
    addressLocality: 'Arusha',
    addressRegion: 'Arusha',
    postalCode: '23100',
    addressCountry: 'TZ',
    latitude: -3.3869,
    longitude: 36.683,
    priceRange: '$$$',
    openingHours: 'Mo-Sa 08:00-18:00',
  },

  pages: {
    home: {
      title: 'HAIBO Tours & Safaris | Luxury Tanzania Safari & Travel',
      description:
        'Book authentic Tanzania safaris, Serengeti migration tours, Zanzibar beach holidays, and Kilimanjaro adventures with HAIBO Tours — expert guides from Arusha.',
      path: '/',
      ogType: 'website',
    },
    destinations: {
      title: 'Tanzania Safari Destinations | HAIBO Tours & Safaris',
      description:
        'Explore Serengeti, Ngorongoro, Zanzibar, Kilimanjaro, Tarangire, and more. Compare packages, prices, and book your Tanzania safari with HAIBO.',
      path: '/destinations.html',
      ogType: 'website',
    },
    destination: {
      titleTemplate: '%NAME% Safari Packages | HAIBO Tours & Safaris',
      descriptionTemplate:
        'Plan your %NAME% safari in Tanzania with HAIBO Tours. %DESC% View packages, best travel seasons, and WhatsApp booking.',
      pathTemplate: '/destinations/%ID%',
      ogType: 'website',
    },
    gallery: {
      title: 'Safari Gallery | HAIBO Tours & Safaris Tanzania',
      description:
        'Browse safari photos and guest videos from Tanzania — wildlife, landscapes, and luxury camps captured on HAIBO Tours adventures.',
      path: '/gallery.html',
      ogType: 'website',
    },
    contact: {
      title: 'Contact HAIBO Tours | Arusha Tanzania Safari Experts',
      description:
        'Call, email, or WhatsApp HAIBO Tours in Arusha, Tanzania. Office hours, map, and fast safari inquiries for your next East Africa trip.',
      path: '/contact.html',
      ogType: 'website',
    },
  },
};

if (typeof HAIBO_CONFIG !== 'undefined' && HAIBO_CONFIG.siteUrl) {
  HAIBO_SEO.siteUrl = HAIBO_CONFIG.siteUrl.replace(/\/$/, '');
}
