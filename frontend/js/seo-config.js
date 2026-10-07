/**
 * HAIBO SEO — site-wide defaults.
 * Titles/descriptions must match the static <head> tags in each public HTML page.
 * Business contact details are NOT hardcoded here: JSON-LD reads the live CMS values
 * (HAIBO_CONFIG, filled from Firestore contact/socials) and omits anything missing.
 */
const HAIBO_SEO = {
  siteName: 'Haibo Africa Tours',
  siteUrl:
    (typeof HAIBO_SITE_URL !== 'undefined' && HAIBO_SITE_URL) || 'https://haiboafricatours.co.tz',
  locale: 'en_US',
  language: 'en',
  defaultOgImage: '/assets/logo/logo.png',
  defaultOgImageWidth: 1179,
  defaultOgImageHeight: 731,

  business: {
    name: 'Haibo Africa Tours',
    alternateName: 'HAIBO Tours & Safaris',
    description:
      'Tanzania tours and safaris, Kilimanjaro climbs and Zanzibar experiences with local guides.',
    addressCountry: 'TZ',
    areaServed: 'Tanzania',
  },

  pages: {
    home: {
      title: 'Haibo Africa Tours | Tanzania Tours & Safaris',
      description:
        'Tanzania safaris, Kilimanjaro climbs and Zanzibar trips with Haibo Africa Tours. Explore itineraries and inclusions, and plan your trip with local experts.',
      path: '/',
      breadcrumb: null,
      ogType: 'website',
    },
    destinations: {
      title: 'Tanzania Safari & Tour Packages | Haibo Africa Tours',
      description:
        'Browse Haibo Africa Tours packages: Serengeti migration safaris, Ngorongoro Crater, Tarangire, Mikumi, Kilimanjaro climbs and Zanzibar Stone Town experiences.',
      path: '/destinations.html',
      breadcrumb: 'Destinations',
      ogType: 'website',
    },
    destination: {
      titleTemplate: '%NAME% | Haibo Africa Tours',
      fallbackDescription:
        '%NAME% with Haibo Africa Tours: itinerary, inclusions, exclusions and trip details. Contact us on WhatsApp to plan your trip.',
      pathTemplate: '/destinations/%ID%',
      ogType: 'website',
    },
    gallery: {
      title: 'Safari Photo & Video Gallery | Haibo Africa Tours',
      description:
        'Photos and videos of wildlife, landscapes and safari moments across Tanzania from Haibo Africa Tours.',
      path: '/gallery.html',
      breadcrumb: 'Gallery',
      ogType: 'website',
    },
    contact: {
      title: 'Contact Us | Haibo Africa Tours',
      description:
        'Contact Haibo Africa Tours by phone, email or WhatsApp to plan your Tanzania safari, Kilimanjaro climb or Zanzibar trip.',
      path: '/contact.html',
      breadcrumb: 'Contact',
      ogType: 'website',
    },
  },
};
