/**
 * Applies HAIBO_CONTENT to the public site DOM (initial + realtime updates).
 */

function setText(sel, text) {
  if (text == null || text === '') return;
  document.querySelectorAll(sel).forEach((el) => {
    el.textContent = text;
  });
}

function setHtml(sel, html) {
  if (!html) return;
  document.querySelectorAll(sel).forEach((el) => {
    el.innerHTML = html;
  });
}

function optimizeImg(url, width) {
  if (typeof window.haiboOptimizeImage === 'function') {
    return window.haiboOptimizeImage(url, { width: width || 1200 });
  }
  return url;
}

function setBgImage(sel, url) {
  if (!url || (typeof haiboValidMediaUrl === 'function' && !haiboValidMediaUrl(url))) return;
  const optimized = optimizeImg(url, 1920);
  document.querySelectorAll(sel).forEach((el) => {
    el.style.setProperty('--hero-bg-image', `url('${optimized}')`);
  });
}

function renderHero() {
  const h = window.HAIBO_CONTENT?.hero;
  if (!h) return;

  const heroBg =
    typeof haiboIsAdminUploadedUrl === 'function' && haiboIsAdminUploadedUrl(h.backgroundImageUrl)
      ? h.backgroundImageUrl
      : '';
  if (heroBg) {
    setBgImage('#home.hero-banner', heroBg);
    const home = document.getElementById('home');
    if (home) home.style.setProperty('--hero-bg-image', `url('${heroBg}')`);
  }
  setText('[data-haibo-hero-eyebrow]', h.eyebrow);
  setText('[data-haibo-hero-title]', h.title);
  setText('[data-haibo-hero-title-accent]', h.titleAccent);
  setHtml('[data-haibo-hero-subtitle]', h.subtitle);

  const btn1 = document.querySelector('[data-haibo-hero-cta-primary]');
  if (btn1 && h.ctaPrimaryText) btn1.textContent = h.ctaPrimaryText;
  if (btn1 && h.ctaPrimaryLink) btn1.href = h.ctaPrimaryLink;

  const btn2 = document.querySelector('[data-haibo-hero-cta-secondary]');
  if (btn2 && h.ctaSecondaryText) btn2.textContent = h.ctaSecondaryText;
  if (btn2 && h.ctaSecondaryLink) btn2.href = h.ctaSecondaryLink;
}

function renderAbout() {
  const a = window.HAIBO_CONTENT?.about;
  if (!a) return;

  setText('[data-haibo-about-eyebrow]', a.eyebrow);
  setText('[data-haibo-about-title]', a.title);
  setText('[data-haibo-about-body]', a.body);
  const aboutImg =
    typeof haiboIsAdminUploadedUrl === 'function' && haiboIsAdminUploadedUrl(a.imageUrl)
      ? a.imageUrl
      : '';
  if (aboutImg) {
    document.querySelectorAll('[data-haibo-about-image]').forEach((img) => {
      img.src = optimizeImg(aboutImg, 1000);
      img.alt = a.imageAlt || 'Luxury Tanzania safari experience with HAIBO Tours';
      img.loading = 'lazy';
      img.decoding = 'async';
    });
  }

  const defaultCards = window.HAIBO_DEFAULTS?.about?.featureCards || [];
  const cards = a.featureCards?.length ? a.featureCards : defaultCards;
  document.querySelectorAll('[data-haibo-about-card]').forEach((card, i) => {
    const c = cards[i] || defaultCards[i];
    if (!c) return;
    const title = card.querySelector('[data-haibo-about-card-title]');
    const sub = card.querySelector('[data-haibo-about-card-sub]');
    if (title) title.textContent = c.title || '';
    if (sub) sub.textContent = c.subtitle || '';
  });
}

function renderHomeGallery() {
  const raw = window.HAIBO_CONTENT?.gallery?.images || [];
  const images = raw.filter((img) => {
    const src = img.src || img.url;
    return typeof haiboIsAdminUploadedUrl === 'function' && haiboIsAdminUploadedUrl(src);
  });
  const grid = document.querySelector('#gallery .home-gallery-preview');
  if (!grid) return;
  if (!images.length) {
    grid.innerHTML =
      '<p class="haibo-empty-state" style="text-align:center;color:#9ca3af;padding:2rem">Gallery photos will appear here once uploaded in the admin panel.</p>';
    return;
  }

  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');

  const slice = images.slice(0, 3);
  grid.innerHTML = slice
    .map((img, i) => {
      const src = optimizeImg(img.src || img.url, 900);
      const alt = img.title
        ? `${img.title} — Tanzania safari gallery`
        : 'Tanzania safari wildlife photo';
      const title = img.title || 'Safari moment';
      const tag = img.tag || 'Tanzania';
      const loading = i === 0 ? 'eager' : 'lazy';
      const fetchpriority = i === 0 ? 'high' : 'auto';
      return `
    <a href="gallery.html" class="gallery-media-card home-gallery-card" aria-label="View gallery: ${esc(title)}">
      <div class="gallery-media-card__media">
        <img class="gallery-media-card__img haibo-media" src="${esc(src)}" alt="${esc(alt)}" loading="${loading}" decoding="async" fetchpriority="${fetchpriority}" width="600" height="800">
        <div class="gallery-media-card__overlay" aria-hidden="true"></div>
        <div class="gallery-media-card__body">
          ${tag ? `<p class="gallery-media-card__tag">${esc(tag)}</p>` : ''}
          <h3 class="gallery-media-card__title">${esc(title)}</h3>
        </div>
      </div>
    </a>`;
    })
    .join('');

  if (typeof window.haiboEnhanceImages === 'function') {
    window.haiboEnhanceImages(grid);
  }
}

function renderHomeCta() {
  const c = window.HAIBO_CONTENT?.hero?.homeCta || window.HAIBO_CONTENT?.settings?.homeCta;
  if (!c) return;
  setText('[data-haibo-home-cta-eyebrow]', c.eyebrow);
  setText('[data-haibo-home-cta-title]', c.title);
  setText('[data-haibo-home-cta-body]', c.body);
  if (c.backgroundImageUrl) {
    const bg = optimizeImg(c.backgroundImageUrl, 1600);
    document.querySelectorAll('[data-haibo-home-cta-bg]').forEach((el) => {
      el.style.backgroundImage = `url('${bg}')`;
      el.className = 'cta-cinematic__bg';
    });
  } else if (c.backgroundClass) {
    document.querySelectorAll('[data-haibo-home-cta-bg]').forEach((el) => {
      el.className = `cta-cinematic__bg ${c.backgroundClass}`;
    });
  }
}

function renderDestinationsSection() {
  const s = window.HAIBO_CONTENT?.settings?.destinationsSection;
  if (!s) return;
  setText('[data-haibo-dest-eyebrow]', s.eyebrow);
  setText('[data-haibo-dest-title]', s.title);
}

function renderGallerySection() {
  const s = window.HAIBO_CONTENT?.settings?.gallerySection;
  if (!s) return;
  setText('[data-haibo-gallery-eyebrow]', s.eyebrow);
  setText('[data-haibo-gallery-title]', s.title);
}

function renderFooter() {
  const f = window.HAIBO_CONTENT?.settings?.footer;
  if (!f) return;
  setText('[data-haibo-footer-brand]', f.brand);
  setText('[data-haibo-footer-about]', f.description);
  setText('[data-haibo-footer-copy]', f.copyright);

  const links = f.quickLinks;
  if (links?.length) {
    const box = document.querySelector('[data-haibo-footer-links]');
    if (box) {
      box.innerHTML = links
        .map(
          (l) =>
            `<a href="${l.href}" class="site-footer__link hover:text-white transition">${l.label}</a>`
        )
        .join('');
    }
  }
}

function renderNav() {
  const st = window.HAIBO_CONTENT?.settings;
  if (st?.brandName) {
    document.querySelectorAll('[data-haibo-brand-name]').forEach((el) => {
      el.textContent = st.brandName;
    });
  }
  if (st?.tagline) {
    document.querySelectorAll('[data-haibo-brand-tagline]').forEach((el) => {
      el.textContent = st.tagline;
    });
  }

  const nav = st?.navLinks;
  if (!nav?.length) return;
  document.querySelectorAll('[data-haibo-nav-desktop]').forEach((wrap) => {
    wrap.innerHTML = nav.map((l) => `<a href="${l.href}">${l.label}</a>`).join('');
  });
  document.querySelectorAll('[data-haibo-nav-mobile]').forEach((wrap) => {
    const book = wrap.querySelector('[data-haibo-nav-book]');
    const bookHtml = book ? book.outerHTML : '';
    wrap.innerHTML = nav.map((l) => `<a href="${l.href}">${l.label}</a>`).join('') + bookHtml;
  });
}

export function applyHaiboContent() {
  renderHero();
  renderAbout();
  renderHomeGallery();
  renderHomeCta();
  renderDestinationsSection();
  renderGallerySection();
  renderFooter();
  renderNav();
}

window.applyHaiboContent = applyHaiboContent;

function afterContentRender() {
  applyHaiboContent();
  if (typeof window.refreshHaiboLiveContent === 'function') {
    window.refreshHaiboLiveContent();
  } else if (typeof haiboBootDestinationGrids === 'function') {
    haiboBootDestinationGrids();
  }
  if (typeof window.haiboEnhanceImages === 'function') window.haiboEnhanceImages();
}

window.addEventListener('haiboContentReady', afterContentRender);
window.addEventListener('haiboContentUpdated', afterContentRender);
