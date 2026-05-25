function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function galleryCardMedia(item, type, index) {
  const imgSrc = (src, w) =>
    typeof window.haiboOptimizeImage === 'function'
      ? window.haiboOptimizeImage(src, { width: w || 900 })
      : src;

  if (type === 'image') {
    const src = imgSrc(item.src, 900);
    return `
      <div class="gallery-media-card__media">
        <img class="gallery-media-card__img haibo-media" src="${src}" alt="${escapeHtml(item.title)} — Tanzania safari photo" loading="lazy" decoding="async" width="600" height="800">
        <div class="gallery-media-card__overlay" aria-hidden="true"></div>
        <div class="gallery-media-card__body">
          ${item.tag ? `<p class="gallery-media-card__tag">${escapeHtml(item.tag)}</p>` : ''}
          <h3 class="gallery-media-card__title">${escapeHtml(item.title)}</h3>
        </div>
      </div>`;
  }

  return `
      <div class="gallery-media-card__media">
        <video class="gallery-media-card__video haibo-media" src="${item.src}" poster="${item.thumb}" muted playsinline preload="metadata"></video>
        <span class="gallery-play-btn" aria-hidden="true">▶</span>
        <div class="gallery-media-card__overlay" aria-hidden="true"></div>
        <div class="gallery-media-card__body">
          ${item.tag ? `<p class="gallery-media-card__tag">${escapeHtml(item.tag)}</p>` : ''}
          <h3 class="gallery-media-card__title">${escapeHtml(item.title)}</h3>
        </div>
      </div>`;
}

function getGalleryData() {
  if (typeof haiboNormalizeGalleryObject === 'function') {
    const g = haiboNormalizeGalleryObject(window.HAIBO_CONTENT?.gallery);
    return {
      images: (g.images || []).map((i) => ({
        src: i.src || i.url,
        title: i.title || '',
        tag: i.tag || '',
      })),
      videos: (g.videos || []).map((v) => ({
        src: v.src,
        thumb: v.thumb || v.src,
        title: v.title || '',
        tag: v.tag || '',
      })),
    };
  }
  return { images: [], videos: [] };
}

function renderGalleryPage() {
  const photosEl = document.getElementById('gallery-photos');
  const videosEl = document.getElementById('gallery-videos');
  if (!photosEl || !videosEl) return;

  photosEl.innerHTML = '';
  videosEl.innerHTML = '';

  const { images, videos } = getGalleryData();
  window.__HAIBO_GALLERY_IMAGES = images;
  window.__HAIBO_GALLERY_VIDEOS = videos;

  const photoCount = document.getElementById('photo-count');
  const videoCount = document.getElementById('video-count');

  if (photoCount) photoCount.textContent = `${images.length} photos`;
  if (videoCount) videoCount.textContent = `${videos.length} videos`;

  const emptyMsg =
    '<p class="haibo-empty-state" style="text-align:center;color:#9ca3af;padding:2rem;grid-column:1/-1">Upload photos or videos in the admin Gallery panel to show them here.</p>';

  photosEl.innerHTML = images.length
    ? images
        .map(
          (item, i) => `
    <article class="gallery-media-card" data-type="image" data-index="${i}" tabindex="0" role="button" aria-label="View ${escapeHtml(item.title)}">
      ${galleryCardMedia(item, 'image', i)}
    </article>
  `
        )
        .join('')
    : emptyMsg;

  videosEl.innerHTML = videos.length
    ? videos
        .map(
          (item, i) => `
    <article class="gallery-media-card gallery-video-card" data-type="video" data-index="${i}" tabindex="0" role="button" aria-label="Play ${escapeHtml(item.title)}">
      ${galleryCardMedia(item, 'video', i)}
    </article>
  `
        )
        .join('')
    : emptyMsg;

  initGalleryLightbox();
  initVideoCardHover();
  if (typeof window.haiboEnhanceImages === 'function') {
    window.haiboEnhanceImages(document.getElementById('gallery-photos'));
  }
}

function initVideoCardHover() {
  document.querySelectorAll('.gallery-video-card video').forEach((video) => {
    const card = video.closest('.gallery-video-card');
    card.addEventListener('mouseenter', () => {
      video.play().catch(() => {});
    });
    card.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });
  });
}

function initGalleryLightbox() {
  const lightbox = document.getElementById('gallery-lightbox');
  const mediaWrap = document.getElementById('lightbox-media');
  const caption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close');
  if (!lightbox || !mediaWrap) return;

  function open(type, index) {
    const images = window.__HAIBO_GALLERY_IMAGES || [];
    const videos = window.__HAIBO_GALLERY_VIDEOS || [];
    mediaWrap.innerHTML = '';
    if (type === 'image') {
      const item = images[index];
      mediaWrap.innerHTML = `<img src="${item.src.replace('w=800', 'w=1600')}" alt="${item.title}">`;
      caption.textContent = `${item.title} · ${item.tag}`;
    } else {
      const item = videos[index];
      mediaWrap.innerHTML = `<video src="${item.src}" controls autoplay playsinline style="max-width:90vw;max-height:85vh;border-radius:1rem;"></video>`;
      caption.textContent = `${item.title} · ${item.tag}`;
    }
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('is-open');
    mediaWrap.innerHTML = '';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.gallery-media-card').forEach((card) => {
    const openCard = () => open(card.dataset.type, parseInt(card.dataset.index, 10));
    card.addEventListener('click', openCard);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCard();
      }
    });
  });

  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function bootGalleryPage() {
  if (document.body.dataset.page !== 'gallery') return;
  if (typeof mergeHaiboContentWithDefaults === 'function') {
    mergeHaiboContentWithDefaults();
  }
  renderGalleryPage();
  if (!window.HAIBO_CONTENT_LOADED) {
    window.addEventListener('haiboContentReady', renderGalleryPage, { once: true });
  }
  window.addEventListener('haiboContentUpdated', renderGalleryPage);
}

document.addEventListener('DOMContentLoaded', bootGalleryPage);
