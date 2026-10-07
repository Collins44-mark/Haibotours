/**
 * HAIBO SEO, structured data, image optimization, and performance helpers
 */
(function () {
  'use strict';

  /** Always the production origin — never the current host (localhost, *.vercel.app, www). */
  function getSiteUrl() {
    const configured =
      (typeof HAIBO_SEO !== 'undefined' && HAIBO_SEO.siteUrl) ||
      (typeof window !== 'undefined' && window.HAIBO_SITE_URL) ||
      'https://haiboafricatours.co.tz';
    return String(configured).replace(/\/$/, '');
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

  function defaultOgImage() {
    return {
      url: absoluteUrl(HAIBO_SEO.defaultOgImage),
      width: HAIBO_SEO.defaultOgImageWidth,
      height: HAIBO_SEO.defaultOgImageHeight,
      alt: `${HAIBO_SEO.siteName} logo`,
    };
  }

  function removeMeta(selector) {
    document.querySelector(selector)?.remove();
  }

  function applyMetaBundle({ title, description, canonical, image, type, noindex }) {
    document.title = title;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    });

    if (noindex) {
      document.querySelector('link[rel="canonical"]')?.remove();
      removeMeta('meta[property="og:url"]');
    } else {
      setLinkRel('canonical', canonical);
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    }

    const img = image?.url ? image : defaultOgImage();

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type || 'website' });
    upsertMeta('meta[property="og:site_name"]', {
      property: 'og:site_name',
      content: HAIBO_SEO.siteName,
    });
    upsertMeta('meta[property="og:locale"]', {
      property: 'og:locale',
      content: HAIBO_SEO.locale,
    });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: img.url });
    upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: img.alt });
    if (img.width && img.height) {
      upsertMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: String(img.width) });
      upsertMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: String(img.height) });
    } else {
      removeMeta('meta[property="og:image:width"]');
      removeMeta('meta[property="og:image:height"]');
    }

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: img.url });
    upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: img.alt });
  }

  /** https URL with tracking query params removed, or '' if not a valid public profile URL. */
  function cleanProfileUrl(url) {
    try {
      const u = new URL(String(url || '').trim());
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
      u.protocol = 'https:';
      u.search = '';
      u.hash = '';
      return u.toString().replace(/\/$/, '');
    } catch {
      return '';
    }
  }

  /** Only values present in the live CMS (contact/socials) are emitted; nothing is guessed. */
  function businessJsonLd() {
    const b = HAIBO_SEO.business;
    const cfg = typeof HAIBO_CONFIG !== 'undefined' ? HAIBO_CONFIG : {};
    const contact = window.HAIBO_CONTENT?.contact || {};
    const socials = window.HAIBO_CONTENT?.socials || {};
    const logoPath = cfg.logoPath || HAIBO_SEO.defaultOgImage;
    const logo = /^https?:\/\//.test(logoPath) ? logoPath : absoluteUrl(logoPath);

    const data = {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      '@id': `${getSiteUrl()}/#organization`,
      name: b.name,
      alternateName: b.alternateName,
      description: b.description,
      url: `${getSiteUrl()}/`,
      logo,
      image: logo,
      areaServed: { '@type': 'Country', name: b.areaServed },
      address: { '@type': 'PostalAddress', addressCountry: b.addressCountry },
    };

    const phone = String(contact.phoneDisplay || '').trim();
    if (phone) data.telephone = phone.replace(/[^\d+]/g, '');
    const email = String(contact.email || '').trim();
    if (email && email.includes('@')) data.email = email;

    const sameAs = [socials.instagram, socials.tiktok]
      .map(cleanProfileUrl)
      .filter(Boolean);
    if (sameAs.length) data.sameAs = [...new Set(sameAs)];

    return data;
  }

  function websiteJsonLd() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${getSiteUrl()}/#website`,
      url: `${getSiteUrl()}/`,
      name: HAIBO_SEO.siteName,
      alternateName: HAIBO_SEO.business.alternateName,
      publisher: { '@id': `${getSiteUrl()}/#organization` },
      inLanguage: HAIBO_SEO.language,
    };
  }

  function destinationDescription(dest) {
    return String(dest.metaDescription || dest.overview || dest.description || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function destinationJsonLd(dest, canonical) {
    const img = optimizeImageUrl(dest.heroImage || dest.image, { width: 1200 });
    const data = {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: dest.name,
      url: canonical,
      provider: { '@id': `${getSiteUrl()}/#organization` },
    };
    const desc = destinationDescription(dest);
    if (desc) data.description = truncate(desc, 300);
    if (img) data.image = img;
    return data;
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
    if (!list.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Tanzania Safari & Tour Packages',
      itemListElement: list.map((d, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: d.name,
        url: absoluteUrl(`destinations/${d.id}`),
      })),
    };
  }

  function homeCrumb() {
    return { name: 'Home', url: `${getSiteUrl()}/` };
  }

  function injectOrganizationSchemas() {
    injectJsonLd('haibo-schema-org', businessJsonLd());
    injectJsonLd('haibo-schema-website', websiteJsonLd());
  }

  let currentPageKey = null;
  let currentDestination = null;

  function applyPageSEO(pageKey) {
    const page = HAIBO_SEO.pages[pageKey];
    if (!page || !page.path) return;
    currentPageKey = pageKey;

    const canonical = absoluteUrl(page.path);

    applyMetaBundle({
      title: page.title,
      description: page.description,
      canonical,
      type: page.ogType,
    });

    injectOrganizationSchemas();

    if (page.breadcrumb) {
      injectJsonLd(
        'haibo-schema-breadcrumb',
        breadcrumbJsonLd([homeCrumb(), { name: page.breadcrumb, url: canonical }])
      );
    }

    if (pageKey === 'destinations') {
      const list = destinationsListJsonLd();
      if (list) injectJsonLd('haibo-schema-list', list);
      else removeJsonLd('haibo-schema-list');
    }
  }

  function applyDestinationSEO(dest) {
    currentPageKey = 'destination';
    currentDestination = dest;
    const page = HAIBO_SEO.pages.destination;
    const title =
      String(dest.seoTitle || '').trim() ||
      page.titleTemplate.replace('%NAME%', dest.name);
    const desc = truncate(
      destinationDescription(dest) || page.fallbackDescription.replace('%NAME%', dest.name),
      160
    );
    const canonical = absoluteUrl(`destinations/${dest.id}`);
    const imgUrl = optimizeImageUrl(dest.heroImage || dest.image, { width: 1200 });
    const image = imgUrl ? { url: imgUrl, alt: dest.name } : null;

    applyMetaBundle({ title, description: desc, canonical, image, type: page.ogType });

    injectOrganizationSchemas();
    injectJsonLd('haibo-schema-trip', destinationJsonLd(dest, canonical));
    injectJsonLd(
      'haibo-schema-breadcrumb',
      breadcrumbJsonLd([
        homeCrumb(),
        { name: 'Destinations', url: absoluteUrl('destinations.html') },
        { name: dest.name, url: canonical },
      ])
    );
  }

  /** Unknown, draft or removed destination slugs must not be indexed. */
  function applyNotFoundSEO() {
    currentPageKey = 'not-found';
    currentDestination = null;
    applyMetaBundle({
      title: `Destination not available | ${HAIBO_SEO.siteName}`,
      description: HAIBO_SEO.pages.destinations.description,
      noindex: true,
    });
    removeJsonLd('haibo-schema-trip');
    removeJsonLd('haibo-schema-breadcrumb');
  }

  /** CMS data (contact, socials, destinations) arrives after first paint — refresh schemas. */
  function refreshSchemasFromContent() {
    if (currentPageKey === 'destination' && currentDestination) {
      injectOrganizationSchemas();
    } else if (currentPageKey && HAIBO_SEO.pages[currentPageKey]?.path) {
      injectOrganizationSchemas();
      if (currentPageKey === 'destinations') {
        const list = destinationsListJsonLd();
        if (list) injectJsonLd('haibo-schema-list', list);
      }
    }
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
    window.addEventListener('haiboContentUpdated', refreshSchemasFromContent);
    initLazyReveal();
    initA11y();
    enhanceImages();
  }

  window.haiboOptimizeImage = optimizeImageUrl;
  window.haiboImgTag = haiboImgTag;
  window.haiboEnhanceImages = enhanceImages;
  window.haiboApplyDestinationSEO = applyDestinationSEO;
  window.haiboApplyPageSEO = applyPageSEO;
  window.haiboApplyNotFoundSEO = applyNotFoundSEO;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSEO);
  } else {
    initSEO();
  }
})();
