/**
 * HAIBO SEO, structured data, image optimization, and performance helpers
 */
(function () {
  'use strict';

  function getSiteUrl() {
    const configured = typeof HAIBO_SEO !== 'undefined' && HAIBO_SEO.siteUrl;
    if (configured && !configured.includes('localhost')) return configured.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin.replace(/\/$/, '');
    }
    return 'https://haibotours.com';
  }

  function absoluteUrl(path) {
    const base = getSiteUrl();
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncate(text, max) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1).trim()}…`;
  }

  /** Cloudinary admin uploads only (no stock / Unsplash URLs). */
  function optimizeImageUrl(url, options) {
    if (!url || typeof url !== 'string') return '';
    const w = options?.width || 1200;
    const q = options?.quality || 'auto';

    if (url.includes('images.unsplash.com')) return '';

    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      if (url.includes('/upload/f_auto') || url.includes('/upload/c_')) return url;
      return url.replace('/upload/', `/upload/f_auto,q_${q},w_${w}/`);
    }

    if (url.includes('cloudinary.com') && url.includes('/image/upload/')) {
      return url.replace('/image/upload/', `/image/upload/f_auto,q_${q},w_${w}/`);
    }

    return '';
  }

  function upsertMeta(selector, attrs) {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      document.head.appendChild(el);
    }
    Object.entries(attrs).forEach(([k, v]) => {
      if (v != null && v !== '') el.setAttribute(k, v);
    });
  }

  function setLinkRel(rel, href) {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = href;
  }

  function removeJsonLd(id) {
    document.getElementById(id)?.remove();
  }

  function injectJsonLd(id, data) {
    removeJsonLd(id);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function applyMetaBundle({ title, description, canonical, image, type, noindex }) {
    document.title = title;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });

    setLinkRel('canonical', canonical);

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type || 'website' });
    upsertMeta('meta[property="og:site_name"]', {
      property: 'og:site_name',
      content: HAIBO_SEO.siteName,
    });
    upsertMeta('meta[property="og:locale"]', {
      property: 'og:locale',
      content: HAIBO_SEO.locale,
    });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    upsertMeta('meta[property="og:image:alt"]', {
      property: 'og:image:alt',
      content: `${HAIBO_SEO.siteName} — Tanzania safari`,
    });

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
    if (HAIBO_SEO.twitterSite) {
      upsertMeta('meta[name="twitter:site"]', { name: 'twitter:site', content: HAIBO_SEO.twitterSite });
    }
  }

  function businessJsonLd() {
    const b = HAIBO_SEO.business;
    const logo = absoluteUrl(
      typeof HAIBO_CONFIG !== 'undefined' && HAIBO_CONFIG.logoPath
        ? HAIBO_CONFIG.logoPath
        : '/assets/logo/logo.png'
    );
    return {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      '@id': `${getSiteUrl()}/#organization`,
      name: b.name,
      description: b.description,
      url: getSiteUrl(),
      logo,
      image: HAIBO_SEO.defaultOgImage,
      telephone: b.telephone,
      email: b.email,
      priceRange: b.priceRange,
      openingHours: b.openingHours,
      address: {
        '@type': 'PostalAddress',
        streetAddress: b.streetAddress,
        addressLocality: b.addressLocality,
        addressRegion: b.addressRegion,
        postalCode: b.postalCode,
        addressCountry: b.addressCountry,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: b.latitude,
        longitude: b.longitude,
      },
      areaServed: { '@type': 'Country', name: 'Tanzania' },
      sameAs: [
        typeof HAIBO_CONFIG !== 'undefined' && HAIBO_CONFIG.social?.instagram,
        typeof HAIBO_CONFIG !== 'undefined' && HAIBO_CONFIG.social?.facebook,
      ].filter(Boolean),
    };
  }

  function websiteJsonLd() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${getSiteUrl()}/#website`,
      url: getSiteUrl(),
      name: HAIBO_SEO.siteName,
      description: HAIBO_SEO.business.description,
      publisher: { '@id': `${getSiteUrl()}/#organization` },
      inLanguage: HAIBO_SEO.language,
    };
  }

  function destinationJsonLd(dest, canonical) {
    const img = optimizeImageUrl(dest.heroImage || dest.image, { width: 1200 });
    return {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: `${dest.name} Safari — ${dest.subtitle}`,
      description: dest.description,
      image: img,
      url: canonical,
      touristType: 'Safari and wildlife travelers',
      provider: { '@id': `${getSiteUrl()}/#organization` },
      itinerary: {
        '@type': 'Place',
        name: dest.name,
        address: { '@type': 'Place', name: dest.region || 'Tanzania' },
      },
    };
  }

  function breadcrumbJsonLd(items) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  function destinationsListJsonLd() {
    const list =
      typeof getHaiboDestinations === 'function'
        ? getHaiboDestinations()
        : typeof DESTINATIONS !== 'undefined'
          ? DESTINATIONS
          : [];
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Tanzania Safari Destinations',
      itemListElement: list.map((d, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${d.name} — ${d.subtitle}`,
        url: absoluteUrl(`destinations/${d.id}`),
      })),
    };
  }

  function applyPageSEO(pageKey) {
    const page = HAIBO_SEO.pages[pageKey];
    if (!page) return;

    const canonical = absoluteUrl(page.path);
    const image = optimizeImageUrl(HAIBO_SEO.defaultOgImage, { width: 1200 });

    applyMetaBundle({
      title: page.title,
      description: page.description,
      canonical,
      image,
      type: page.ogType,
    });

    injectJsonLd('haibo-schema-org', businessJsonLd());
    injectJsonLd('haibo-schema-website', websiteJsonLd());

    if (pageKey === 'home') {
      /* WebSite + TravelAgency sufficient */
    } else if (pageKey === 'destinations') {
      injectJsonLd('haibo-schema-list', destinationsListJsonLd());
    } else if (pageKey === 'contact') {
      injectJsonLd('haibo-schema-local', {
        ...businessJsonLd(),
        '@type': ['TravelAgency', 'LocalBusiness'],
      });
    }
  }

  function applyDestinationSEO(dest) {
    const page = HAIBO_SEO.pages.destination;
    const title = page.titleTemplate.replace('%NAME%', dest.name);
    const desc = truncate(
      page.descriptionTemplate
        .replace('%NAME%', dest.name)
        .replace('%DESC%', dest.description),
      160
    );
    const canonical = absoluteUrl(`destinations/${dest.id}`);
    const image = optimizeImageUrl(dest.heroImage || dest.image, { width: 1200 });

    applyMetaBundle({ title, description: desc, canonical, image, type: 'website' });

    injectJsonLd('haibo-schema-org', businessJsonLd());
    injectJsonLd('haibo-schema-trip', destinationJsonLd(dest, canonical));
    injectJsonLd(
      'haibo-schema-breadcrumb',
      breadcrumbJsonLd([
        { name: 'Home', url: getSiteUrl() },
        { name: 'Destinations', url: absoluteUrl('destinations.html') },
        { name: dest.name, url: canonical },
      ])
    );
  }

  function haiboImgTag(src, alt, options) {
    const url = optimizeImageUrl(src, options);
    const cls = options?.class || 'haibo-media';
    const loading = options?.priority ? 'eager' : 'lazy';
    const fetchpriority = options?.priority ? 'high' : 'auto';
    const w = options?.width ? ` width="${options.width}"` : '';
    const h = options?.height ? ` height="${options.height}"` : '';
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" class="${cls}" loading="${loading}" decoding="async" fetchpriority="${fetchpriority}"${w}${h}>`;
  }

  function enhanceImages(root) {
    const scope = root || document;
    scope.querySelectorAll('img').forEach((img, index) => {
      if (img.dataset.haiboOptimized) return;
      const src = img.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        img.src = optimizeImageUrl(src, {
          width: img.dataset.haiboWidth ? Number(img.dataset.haiboWidth) : 1200,
        });
      }
      if (!img.hasAttribute('loading')) {
        img.loading = index < 2 ? 'eager' : 'lazy';
      }
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
      if (!img.alt && img.dataset.haiboAlt) img.alt = img.dataset.haiboAlt;
      img.dataset.haiboOptimized = '1';
    });
  }

  function initLazyReveal() {
    if (!('IntersectionObserver' in window)) return;
    const els = document.querySelectorAll('.fade-up, .destination-card, .gallery-media-card');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '40px', threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
  }

  function initA11y() {
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
      menuBtn.setAttribute('aria-expanded', mobileMenu.classList.contains('open') ? 'true' : 'false');
      menuBtn.setAttribute('aria-controls', 'mobile-menu');
      if (!mobileMenu.id) mobileMenu.id = 'mobile-menu';
    }

    document.querySelectorAll('section[id]').forEach((section) => {
      if (!section.getAttribute('aria-label') && section.querySelector('h1, h2')) {
        const heading = section.querySelector('h1, h2');
        if (heading?.textContent) section.setAttribute('aria-labelledby', heading.id || '');
      }
    });
  }

  function initPerf() {
    setLinkRel('sitemap', absoluteUrl('sitemap.xml'));
    if (!document.querySelector('link[rel="preconnect"][href*="cloudinary"]')) {
      const pc = document.createElement('link');
      pc.rel = 'preconnect';
      pc.href = 'https://res.cloudinary.com';
      pc.crossOrigin = 'anonymous';
      document.head.appendChild(pc);
    }
  }

  function initSEO() {
    initPerf();
    const pageKey =
      document.querySelector('meta[name="haibo-seo-page"]')?.content ||
      document.body?.dataset?.page ||
      'home';

    const map = {
      home: 'home',
      destinations: 'destinations',
      'destination-detail': 'destination',
      gallery: 'gallery',
      contact: 'contact',
    };

    const key = map[pageKey] || pageKey;
    if (key !== 'destination') applyPageSEO(key);
    initLazyReveal();
    initA11y();
    enhanceImages();
  }

  window.haiboOptimizeImage = optimizeImageUrl;
  window.haiboImgTag = haiboImgTag;
  window.haiboEnhanceImages = enhanceImages;
  window.haiboApplyDestinationSEO = applyDestinationSEO;
  window.haiboApplyPageSEO = applyPageSEO;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSEO);
  } else {
    initSEO();
  }
})();
