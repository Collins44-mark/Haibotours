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
  /** Square crop of the official logo; also the source of /favicon.png and /favicon.ico. */
  logo: '/assets/logo/haibo-logo-512.png',

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
      title: 'Tanzania Safari Tours, Kilimanjaro & Zanzibar | Haibo Africa Tours',
      description:
        'Tanzania safari tours with Haibo Africa Tours: Serengeti migration and Northern Tanzania safaris, Mikumi National Park, a Kilimanjaro climb and Zanzibar trips.',
      path: '/',
      breadcrumb: null,
      ogType: 'website',
    },
    destinations: {
      title: 'Tanzania Safari Packages & Tours | Haibo Africa Tours',
      description:
        'Compare Tanzania safari packages: Serengeti migration and calving safaris, Northern Tanzania circuits, Mikumi, a Kilimanjaro Lemosho climb and a Zanzibar tour.',
      path: '/destinations',
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
      title: 'Tanzania Safari Photo & Video Gallery | Haibo Africa Tours',
      description:
        "Tanzania safari photos and videos from Haibo Africa Tours: elephants, zebras and giraffes, game drives, Mount Kilimanjaro above the clouds and Zanzibar's coast.",
      path: '/gallery.html',
      breadcrumb: 'Gallery',
      ogType: 'website',
    },
    contact: {
      title: 'Contact Haibo Africa Tours | Plan Your Tanzania Safari',
      description:
        'Contact Haibo Africa Tours by WhatsApp, phone or email to plan a Tanzania safari, the Kilimanjaro Lemosho climb or a Zanzibar trip and to check availability.',
      path: '/contact.html',
      breadcrumb: 'Contact',
      ogType: 'website',
    },
  },
};
