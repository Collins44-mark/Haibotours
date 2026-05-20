const WHATSAPP_ICON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

/** Background class per destination (location-specific) */
const DESTINATION_CTA_BG = {
  serengeti: 'cta-bg-serengeti-plains',
  ngorongoro: 'cta-bg-ngorongoro',
  zanzibar: 'cta-bg-zanzibar-beach',
  kilimanjaro: 'cta-bg-kili',
  tarangire: 'cta-bg-tarangire-elephants',
  'lake-manyara': 'cta-bg-lake-manyara',
  ruaha: 'cta-bg-ruaha-lions',
  mikumi: 'cta-bg-mikumi-lion',
  arusha: 'cta-bg-arusha',
};

function getDestinationCtaBg(destId) {
  return DESTINATION_CTA_BG[destId] || 'cta-bg-safari';
}

function ctaCinematicCard(content, bgClass, options = {}) {
  const float = options.float ? ' cta-cinematic--float' : '';
  const rounded = options.rounded || 'rounded-[40px]';
  const extra = options.extraClass || '';
  return `
    <div class="cta-cinematic${float} ${rounded} ${extra}">
      ${ctaCinematicLayers(bgClass)}
      <div class="cta-cinematic__content">${content}</div>
    </div>
  `;
}

function ctaCinematicLayers(bgClass) {
  return `
    <div class="cta-cinematic__bg ${bgClass}" aria-hidden="true"></div>
    <div class="cta-cinematic__overlay" aria-hidden="true"></div>
    <div class="cta-cinematic__vignette" aria-hidden="true"></div>
    <div class="cta-cinematic__glow" aria-hidden="true"></div>
  `;
}

function applyLogo() {
  document.querySelectorAll('[data-haibo-logo]').forEach((img) => {
    img.src = HAIBO_CONFIG.logoPath;
    img.onerror = () => {
      img.style.display = 'none';
    };
  });
}

const CONTACT_ICONS = {
  phone: '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>',
  email: '<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>',
  whatsapp: '<svg class="icon-fill" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  office: '<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  hours: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  website: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
};

const SOCIAL_ICONS = {
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#f58529"/><stop offset="50%" style="stop-color:#dd2a7b"/><stop offset="100%" style="stop-color:#515bd4"/></linearGradient></defs><path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-2.796c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/><path fill="#fff" d="M16.671 15.578l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h2.796V6.031s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v3.384H7.078v3.47h3.047V24h4.453v-8.422h2.093z"/></svg>`,
};

function initContactPage() {
  const cards = document.getElementById('contact-cards');
  if (!cards) return;

  const items = [
    { icon: 'phone', label: 'Phone', value: HAIBO_CONFIG.phoneDisplay, href: `tel:${HAIBO_CONFIG.phoneDisplay.replace(/\s/g, '')}` },
    { icon: 'email', label: 'Email', value: HAIBO_CONFIG.email, href: `mailto:${HAIBO_CONFIG.email}` },
    { icon: 'whatsapp', label: 'WhatsApp', value: 'Message us anytime', href: getWhatsAppUrl(), external: true },
    { icon: 'office', label: 'Office', value: HAIBO_CONFIG.address, href: HAIBO_CONFIG.mapUrl, external: true },
    { icon: 'hours', label: 'Hours', value: HAIBO_CONFIG.officeHours, href: null },
    { icon: 'website', label: 'Website', value: 'haibotours.com', href: 'index.html' },
  ];

  cards.innerHTML = items
    .map((item) => {
      const inner = `
        <div class="glass contact-card rounded-3xl p-8 border border-white/10 h-full">
          <div class="contact-icon">${CONTACT_ICONS[item.icon]}</div>
          <p class="text-xs orange uppercase tracking-[3px] mb-2">${item.label}</p>
          <p class="text-lg font-medium text-gray-100 leading-relaxed">${item.value}</p>
        </div>
      `;
      if (item.href) {
        const rel = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${item.href}"${rel} class="block h-full">${inner}</a>`;
      }
      return `<div class="h-full">${inner}</div>`;
    })
    .join('');

  const social = document.getElementById('contact-social');
  const form = document.getElementById('contact-form');

  if (social && HAIBO_CONFIG.social) {
    social.innerHTML = `
      <a href="${HAIBO_CONFIG.social.instagram}" target="_blank" rel="noopener noreferrer" class="social-link social-link--instagram" aria-label="Follow us on Instagram">
        ${SOCIAL_ICONS.instagram}
        <span>Instagram</span>
      </a>
      <a href="${HAIBO_CONFIG.social.facebook}" target="_blank" rel="noopener noreferrer" class="social-link social-link--facebook" aria-label="Follow us on Facebook">
        ${SOCIAL_ICONS.facebook}
        <span>Facebook</span>
      </a>
    `;
  }

  if (form) {
    let msgEl = form.querySelector('.form-message');
    if (!msgEl) {
      msgEl = document.createElement('p');
      msgEl.className = 'form-message hidden';
      form.appendChild(msgEl);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn?.textContent;

      const payload = {
        name: data.get('name'),
        email: data.get('email'),
        phone: data.get('phone') || null,
        interest: data.get('interest'),
        message: data.get('message'),
        destinationSlug: data.get('destinationSlug') || null,
        packageName: data.get('packageName') || null,
        source: 'contact-page',
      };

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending...';
      }

      try {
        if (HAIBO_CONFIG.apiBaseUrl) {
          const result = await submitInquiry(payload);
          showFormMessage(msgEl, result.message, false);
          form.reset();
        } else {
          const body = [
            `Name: ${payload.name}`,
            `Email: ${payload.email}`,
            `Phone: ${payload.phone || '—'}`,
            `Interest: ${payload.interest}`,
            '',
            String(payload.message),
          ].join('\n');
          window.location.href = `mailto:${HAIBO_CONFIG.email}?subject=${encodeURIComponent('Safari Inquiry — ' + payload.name)}&body=${encodeURIComponent(body)}`;
        }
      } catch (err) {
        showFormMessage(msgEl, err.message || 'Could not send inquiry. Try WhatsApp or email.', true);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }
    });
  }
}

function initNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  let msgEl = form.querySelector('.newsletter-message');
  if (!msgEl) {
    msgEl = document.createElement('p');
    msgEl.className = 'newsletter-message hidden text-xs px-5 py-2 text-center w-full';
    form.parentElement?.appendChild(msgEl);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = new FormData(form).get('email');
    const btn = form.querySelector('button[type="submit"]');

    if (!HAIBO_CONFIG.apiBaseUrl) {
      alert('Thank you for subscribing!');
      form.reset();
      return;
    }

    if (btn) btn.disabled = true;

    try {
      const result = await subscribeNewsletter(email);
      msgEl.textContent = result.message;
      msgEl.className = 'newsletter-message text-xs px-5 py-2 text-center w-full text-green-400';
      form.reset();
    } catch (err) {
      msgEl.textContent = err.message || 'Subscription failed.';
      msgEl.className = 'newsletter-message text-xs px-5 py-2 text-center w-full text-red-400';
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

function showHaiboToast(message, title) {
  let toast = document.getElementById('haibo-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'haibo-toast';
    toast.className = 'haibo-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.innerHTML = title
    ? `<strong>${title}</strong>${message}`
    : message;

  toast.classList.add('is-visible');
  clearTimeout(showHaiboToast._timer);
  showHaiboToast._timer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 3800);
}

function safariSearchRedirectUrl(slug) {
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:';
  return isLocal ? destinationDetailUrl(slug) : destinationPrettyUrl(slug);
}

function initSearchBar() {
  const bar = document.getElementById('safari-search');
  if (!bar || typeof DESTINATIONS === 'undefined') return;

  const destSelect = bar.querySelector('[name="destination"]');
  if (destSelect && destSelect.tagName === 'SELECT') {
    destSelect.innerHTML =
      '<option value="" disabled selected>Select destination</option>' +
      DESTINATIONS.map(
        (d) => `<option value="${d.id}">${d.name} — ${d.subtitle}</option>`
      ).join('');
  }

  const dateInput = bar.querySelector('[name="travelDate"]');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  bar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(bar);
    const destinationInput = data.get('destination');
    const slug = resolveDestinationSlug(destinationInput);

    if (!slug) {
      showHaiboToast('No safari package found', 'HAIBO Tours');
      return;
    }

    const payload = {
      destination: slug,
      travelDate: data.get('travelDate') || null,
      travelers: data.get('travelers') ? Number(data.get('travelers')) : null,
    };

    try {
      sessionStorage.setItem(
        'haibo_safari_search',
        JSON.stringify({ ...payload, searchedAt: Date.now() })
      );
    } catch {
      /* ignore */
    }

    const btn = bar.querySelector('.safari-search__submit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Searching…';
    }

    if (HAIBO_CONFIG.apiBaseUrl) {
      try {
        await submitSearch(payload);
      } catch {
        /* still redirect when destination is valid */
      }
    }

    window.location.href = safariSearchRedirectUrl(slug);
  });
}

function initMobileMenu() {
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!menuBtn || !mobileMenu) return;

  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

function initWhatsAppFloat(customMessage) {
  const existing = document.getElementById('whatsapp-float');
  if (existing) return;

  const link = document.createElement('a');
  link.id = 'whatsapp-float';
  link.href = getWhatsAppUrl(customMessage);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'whatsapp-float floating';
  link.setAttribute('aria-label', 'Chat with HAIBO Tours on WhatsApp');
  link.innerHTML = WHATSAPP_ICON_SVG;
  document.body.appendChild(link);
}

function renderDestinationCard(dest) {
  const href = destinationDetailUrl(dest.id);
  return `
    <a href="${href}" class="destination-card glass rounded-[30px] overflow-hidden">
      <div class="relative dest-card-media">
        <img src="${dest.image}" alt="${dest.name} — ${dest.subtitle}" class="haibo-media h-[380px] md:h-[420px] w-full object-cover">
        <div class="absolute inset-0 overlay-dark"></div>
        <div class="absolute bottom-6 left-6 right-6">
          <p class="text-xs orange uppercase tracking-[3px] mb-1">${dest.region}</p>
          <h3 class="text-2xl font-semibold mb-1">${dest.name}</h3>
          <p class="text-gray-300">${dest.subtitle}</p>
          <p class="text-sm text-gray-400 mt-3">From ${dest.packages[0]?.price || 'Contact us'}</p>
        </div>
      </div>
    </a>
  `;
}

function renderDestinationCards(containerId, limit) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const list = limit ? DESTINATIONS.slice(0, limit) : DESTINATIONS;
  container.innerHTML = list.map(renderDestinationCard).join('');
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function renderDestinationDetail() {
  const id = typeof getDestinationIdFromLocation === 'function'
    ? getDestinationIdFromLocation()
    : getQueryParam('id');
  const dest = getDestinationById(id);

  if (!dest) {
    document.getElementById('detail-root').innerHTML = `
      <section class="py-32 px-8 text-center">
        <h1 class="text-4xl font-bold mb-4">Destination not found</h1>
        <p class="text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
        <a href="destinations.html" class="btn-main px-8 py-4 rounded-full">View All Destinations</a>
      </section>
    `;
    return;
  }

  document.title = `${dest.name} — HAIBO Tours & Safaris`;

  const waMessage = `Hello HAIBO Tours! I'm interested in the ${dest.name} (${dest.subtitle}) package. Please share details and availability.`;
  initWhatsAppFloat(waMessage);

  const destBg = getDestinationCtaBg(dest.id);
  const packagesHtml = dest.packages
    .map(
      (pkg) => `
    <div class="cta-cinematic package-card rounded-3xl ${pkg.popular ? 'popular' : ''}">
      ${ctaCinematicLayers(destBg)}
      <div class="cta-cinematic__content p-8">
      ${pkg.popular ? '<span class="inline-block text-xs font-semibold orange bg-orange-500/10 px-3 py-1 rounded-full mb-4">Most Popular</span>' : ''}
      <h3 class="text-2xl font-bold mb-2">${pkg.name}</h3>
      <p class="text-gray-300 mb-4">${pkg.duration}</p>
      <p class="text-4xl font-bold orange mb-1">${pkg.price}</p>
      <p class="text-sm text-gray-400 mb-6">${pkg.priceNote}</p>
      <ul class="space-y-3 text-gray-200 mb-8">
        ${pkg.features.map((f) => `<li class="flex gap-2"><span class="orange">✓</span>${f}</li>`).join('')}
      </ul>
      <a href="${getWhatsAppUrl(`Hello HAIBO Tours! I'd like to book the "${pkg.name}" package for ${dest.name}. Please assist me with dates and payment options.`)}" target="_blank" rel="noopener noreferrer" class="btn-main w-full text-center py-4 rounded-2xl block">
        Book This Package
      </a>
      </div>
    </div>
  `
    )
    .join('');

  const exp = dest.experience;
  const experienceHtml = exp
    ? exp.items
        .map(
          (item) => `
    <div class="dest-experience-card glass rounded-3xl p-6 border border-white/10">
      <h4 class="text-lg font-semibold orange mb-3">${item.title}</h4>
      <p class="text-gray-400 text-sm leading-relaxed">${item.text}</p>
    </div>
  `
        )
        .join('')
    : '';

  const galleryHtml = dest.gallery
    .map(
      (img, i) => `
    <img src="${img}" alt="${dest.name} gallery ${i + 1}" class="haibo-media gallery-item rounded-[24px] object-cover w-full ${i === 0 ? 'md:col-span-2 md:row-span-2 h-[280px] md:h-full min-h-[280px]' : 'h-[220px] md:h-[240px]'}">
  `
    )
    .join('');

  const highlightsHtml = dest.highlights.map((h) => `<span class="glass px-4 py-2 rounded-full text-sm">${h}</span>`).join('');

  document.getElementById('detail-root').innerHTML = `
    <section class="page-hero hero hero-banner flex items-end" style="--hero-bg-image: url('${dest.heroImage}')">
      <div class="hero-inner w-full flex items-end px-8 md:px-20">
        <div class="max-w-4xl fade-up">
          <p class="orange uppercase tracking-[5px] text-sm mb-3">${dest.region}</p>
          <h1 class="page-heading font-extrabold mb-4">${dest.name}</h1>
          <p class="text-xl text-gray-300 mb-6">${dest.subtitle}</p>
          <p class="text-gray-200 leading-8 max-w-2xl mb-8">${dest.description}</p>
          <div class="flex flex-wrap gap-3 mb-6">${highlightsHtml}</div>
          <p class="text-sm text-gray-400"><strong class="text-white">Best time:</strong> ${dest.bestTime}</p>
        </div>
      </div>
    </section>

    <section class="py-20 px-8 md:px-20 bg-[#111]">
      <div class="text-center mb-14">
        <p class="orange uppercase tracking-[5px] mb-3">Safari Packages</p>
        <h2 class="section-title">Choose Your ${dest.name} Package</h2>
        <p class="text-gray-400 mt-4 max-w-2xl mx-auto">Curated itineraries with park fees, comfortable stays, and HAIBO guest support.</p>
      </div>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        ${packagesHtml}
      </div>
    </section>

    <section class="py-20 px-8 md:px-20 bg-black">
      <div class="grid lg:grid-cols-2 gap-16 items-start">
        <div>
          <p class="orange uppercase tracking-[5px] mb-3">${exp?.label || 'Discover'}</p>
          <h2 class="section-title mb-6">${exp?.title || `Explore ${dest.name}`}</h2>
          <p class="text-gray-400 leading-8 mb-10">${exp?.intro || ''}</p>
          <div class="space-y-5">${experienceHtml}</div>
        </div>
        <div>
          <p class="orange uppercase tracking-[5px] mb-3 text-center lg:text-left">Photo Gallery</p>
          <h2 class="section-title mb-8 text-center lg:text-left">Visual Journey</h2>
          <div class="gallery grid grid-cols-2 gap-4">${galleryHtml}</div>
        </div>
      </div>
    </section>

    <section class="py-20 px-8 md:px-20 bg-[#111]">
      <div class="cta-cinematic cta-cinematic--float rounded-[40px] max-w-4xl mx-auto">
        ${ctaCinematicLayers(getDestinationCtaBg(dest.id))}
        <div class="cta-cinematic__content p-12 md:p-16 text-center">
          <h2 class="text-3xl md:text-4xl font-bold mb-4">Ready for ${dest.name}?</h2>
          <p class="text-gray-300 mb-8">Message us on WhatsApp for a custom itinerary or to book any package above.</p>
          <div class="flex flex-wrap justify-center gap-4">
            <a href="${getWhatsAppUrl(waMessage)}" target="_blank" rel="noopener noreferrer" class="btn-main px-10 py-4 rounded-full">WhatsApp Inquiry</a>
            <a href="destinations.html" class="glass px-10 py-4 rounded-full">More Destinations</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  applyLogo();
  initMobileMenu();
  initNewsletterForm();
  initSearchBar();

  if (document.body.dataset.page === 'contact') {
    initWhatsAppFloat();
    initContactPage();
  }

  if (document.body.dataset.page === 'gallery') {
    initWhatsAppFloat();
  }

  if (document.body.dataset.page === 'home') {
    initWhatsAppFloat();
    renderDestinationCards('home-destinations', 4);
  }

  if (document.body.dataset.page === 'destinations') {
    initWhatsAppFloat();
    renderDestinationCards('all-destinations');
  }

  if (document.body.dataset.page === 'destination-detail') {
    renderDestinationDetail();
  } else if (!document.getElementById('whatsapp-float')) {
    initWhatsAppFloat();
  }
});
