function getGalleryData() {
  const g = window.HAIBO_CONTENT?.gallery;
  if (g?.images?.length || g?.videos?.length) {
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
  return {
    images: typeof GALLERY_IMAGES !== 'undefined' ? GALLERY_IMAGES : [],
    videos: typeof GALLERY_VIDEOS !== 'undefined' ? GALLERY_VIDEOS : [],
  };
}

function renderGalleryPage() {
  const photosEl = document.getElementById('gallery-photos');
  const videosEl = document.getElementById('gallery-videos');
  if (!photosEl || !videosEl) return;

  const { images, videos } = getGalleryData();
  window.__HAIBO_GALLERY_IMAGES = images;
  window.__HAIBO_GALLERY_VIDEOS = videos;

  const photoCount = document.getElementById('photo-count');
  const videoCount = document.getElementById('video-count');

  if (photoCount) photoCount.textContent = `${images.length} photos`;
  if (videoCount) videoCount.textContent = `${videos.length} videos`;

  const imgSrc = (src, w) =>
    typeof window.haiboOptimizeImage === 'function'
      ? window.haiboOptimizeImage(src, { width: w || 900 })
      : src;

  photosEl.innerHTML = images
    .map(
      (item, i) => `
    <article class="gallery-media-card" data-type="image" data-index="${i}" tabindex="0" role="button" aria-label="View ${item.title}">
      <img class="gallery-media-card__img haibo-media" src="${imgSrc(item.src, 900)}" alt="${item.title} — Tanzania safari photo" loading="lazy" decoding="async" width="900" height="600">
      <div class="gallery-media-card__overlay"></div>
      <div class="gallery-media-card__body">
        <p class="gallery-media-card__tag">${item.tag}</p>
        <h3 class="gallery-media-card__title">${item.title}</h3>
      </div>
    </article>
  `
    )
    .join('');

  videosEl.innerHTML = videos
    .map(
      (item, i) => `
    <article class="gallery-media-card gallery-video-card" data-type="video" data-index="${i}" tabindex="0" role="button" aria-label="Play ${item.title}">
      <video class="gallery-media-card__video haibo-media" src="${item.src}" poster="${item.thumb}" muted playsinline preload="metadata"></video>
      <span class="gallery-play-btn" aria-hidden="true">▶</span>
      <div class="gallery-media-card__overlay"></div>
      <div class="gallery-media-card__body">
        <p class="gallery-media-card__tag">${item.tag}</p>
        <h3 class="gallery-media-card__title">${item.title}</h3>
      </div>
    </article>
  `
    )
    .join('');

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
