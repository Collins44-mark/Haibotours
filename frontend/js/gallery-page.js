function renderGalleryPage() {
  const photosEl = document.getElementById('gallery-photos');
  const videosEl = document.getElementById('gallery-videos');
  if (!photosEl || !videosEl) return;

  const photoCount = document.getElementById('photo-count');
  const videoCount = document.getElementById('video-count');

  if (photoCount) photoCount.textContent = `${GALLERY_IMAGES.length} photos`;
  if (videoCount) videoCount.textContent = `${GALLERY_VIDEOS.length} videos`;

  photosEl.innerHTML = GALLERY_IMAGES.map(
    (item, i) => `
    <article class="gallery-media-card" data-type="image" data-index="${i}" tabindex="0" role="button" aria-label="View ${item.title}">
      <img class="gallery-media-card__img" src="${item.src}" alt="${item.title}" loading="lazy">
      <div class="gallery-media-card__overlay"></div>
      <div class="gallery-media-card__body">
        <p class="gallery-media-card__tag">${item.tag}</p>
        <h3 class="gallery-media-card__title">${item.title}</h3>
      </div>
    </article>
  `
  ).join('');

  videosEl.innerHTML = GALLERY_VIDEOS.map(
    (item, i) => `
    <article class="gallery-media-card gallery-video-card" data-type="video" data-index="${i}" tabindex="0" role="button" aria-label="Play ${item.title}">
      <video class="gallery-media-card__video" src="${item.src}" poster="${item.thumb}" muted playsinline preload="metadata"></video>
      <span class="gallery-play-btn" aria-hidden="true">▶</span>
      <div class="gallery-media-card__overlay"></div>
      <div class="gallery-media-card__body">
        <p class="gallery-media-card__tag">${item.tag}</p>
        <h3 class="gallery-media-card__title">${item.title}</h3>
      </div>
    </article>
  `
  ).join('');

  initGalleryLightbox();
  initVideoCardHover();
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
    mediaWrap.innerHTML = '';
    if (type === 'image') {
      const item = GALLERY_IMAGES[index];
      mediaWrap.innerHTML = `<img src="${item.src.replace('w=800', 'w=1600')}" alt="${item.title}">`;
      caption.textContent = `${item.title} · ${item.tag}`;
    } else {
      const item = GALLERY_VIDEOS[index];
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'gallery') {
    renderGalleryPage();
  }
});
