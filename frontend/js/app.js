const WHATSAPP_ICON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

function ctaCinematicCard(content, options = {}) {
  const float = options.float ? ' cta-cinematic--float' : '';
  const rounded = options.rounded || 'rounded-[40px]';
  const extra = options.extraClass || '';
  return `
    <div class="cta-cinematic${float} ${rounded} ${extra}">
      ${ctaCinematicLayers()}
      <div class="cta-cinematic__content">${content}</div>
    </div>
  `;
}

function ctaCinematicLayers() {
  return `
    <div class="cta-cinematic__bg" aria-hidden="true"></div>
    <div class="cta-cinematic__overlay" aria-hidden="true"></div>
    <div class="cta-cinematic__vignette" aria-hidden="true"></div>
    <div class="cta-cinematic__glow" aria-hidden="true"></div>
  `;
}

const DEST_CTA_MOUNTAIN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18 L8 10 L12 14 L16 6 L20 18 Z"/><path d="M3 18h18"/></svg>`;

const DEST_CTA_WA_ICON = `<svg class="dest-cta-btn__wa-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

/** Compact horizontal CTA for destination detail pages (all destinations). */
function renderDestinationCta(dest, waMessage) {
  const waHref = getWhatsAppUrl(waMessage);
  const name = escapeHtml(dest.name);

  return `
    <section class="dest-cta-section py-20 px-8 md:px-20 bg-[#111]">
      <div class="dest-cta-cinematic cta-cinematic cta-cinematic--float rounded-[40px] max-w-4xl mx-auto">
        ${ctaCinematicLayers()}
        <div class="cta-cinematic__content dest-cta-card__content">
          <div class="dest-cta-card__inner">
            <div class="dest-cta-card__icon">${DEST_CTA_MOUNTAIN_SVG}</div>
            <div class="dest-cta-card__body">
              <h2 class="dest-cta-card__title">Ready for ${name}?</h2>
              <p class="dest-cta-card__text">Message us on WhatsApp for a custom itinerary or to book any package above.</p>
              <div class="dest-cta-card__actions">
                <a href="${waHref}" target="_blank" rel="noopener noreferrer" class="btn-main dest-cta-btn dest-cta-btn--primary">
                  ${DEST_CTA_WA_ICON}
                  <span>WhatsApp Inquiry</span>
                </a>
                <a href="destinations.html" class="glass dest-cta-btn dest-cta-btn--secondary">
                  <span>More Destinations</span>
                  <span class="dest-cta-btn__chevron" aria-hidden="true">›</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
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
  if (!form || form.dataset.haiboBound === '1') return;
  form.dataset.haiboBound = '1';

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

function getDestinationsForUi() {
  try {
    if (typeof getHaiboDestinations === 'function') {
      return getHaiboDestinations();
    }
  } catch (err) {
    console.warn('HAIBO getDestinationsForUi:', err);
  }
  return Array.isArray(window.DESTINATIONS) ? window.DESTINATIONS : [];
}

function initSearchBar() {
  const bar = document.getElementById('safari-search');
  if (!bar) return;

  const destSelect = bar.querySelector('[name="destination"]');
  if (destSelect && destSelect.tagName === 'SELECT') {
    const enabledIds = window.HAIBO_CONTENT?.search?.enabledDestinationIds;
    const all = getDestinationsForUi();
    const list =
      enabledIds?.length > 0
        ? all.filter((d) => enabledIds.includes(d.id))
        : all;
    destSelect.innerHTML =
      '<option value="" disabled selected>Select destination</option>' +
      list
        .map((d) => `<option value="${d.id}">${d.name} — ${d.subtitle}</option>`)
        .join('');
  }

  const dateInput = bar.querySelector('[name="travelDate"]');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }

  if (bar.dataset.haiboSearchBound === '1') return;
  bar.dataset.haiboSearchBound = '1';

  bar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(bar);
    const destinationInput = data.get('destination');
    const slug = resolveDestinationSlug(destinationInput);

    if (!slug) {
      showHaiboToast('No safari destination found', 'HAIBO Tours');
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
  if (window.__HAIBO_MOBILE_MENU_INIT) return;
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!menuBtn || !mobileMenu) return;
  window.__HAIBO_MOBILE_MENU_INIT = true;

  let backdrop = document.getElementById('mobile-menu-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobile-menu-backdrop';
    backdrop.className = 'mobile-menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
  }

  function setMenuOpen(open) {
    mobileMenu.classList.toggle('open', open);
    menuBtn.classList.toggle('is-open', open);
    document.body.classList.toggle('mobile-nav-open', open);
    backdrop.classList.toggle('is-visible', open);
    backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  menuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(!mobileMenu.classList.contains('open'));
  });

  backdrop.addEventListener('click', () => setMenuOpen(false));

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) setMenuOpen(false);
  });
}

function initWhatsAppFloat(customMessage) {
  const message = customMessage ?? document.getElementById('whatsapp-float')?.dataset.waMessage ?? '';
  const existing = document.getElementById('whatsapp-float');
  if (existing) {
    existing.dataset.waMessage = message;
    existing.href = getWhatsAppUrl(message);
    return existing;
  }

  const link = document.createElement('a');
  link.id = 'whatsapp-float';
  link.dataset.waMessage = message;
  link.href = getWhatsAppUrl(message);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'whatsapp-float floating';
  link.setAttribute('aria-label', 'Chat with HAIBO Tours on WhatsApp');
  link.innerHTML = WHATSAPP_ICON_SVG;
  document.body.appendChild(link);
  return link;
}

function syncWhatsAppLinks() {
  const ctaWa = document.getElementById('cta-whatsapp');
  if (ctaWa) ctaWa.href = getWhatsAppUrl();
  const floatingWa = document.getElementById('whatsapp-float');
  if (floatingWa) {
    floatingWa.href = getWhatsAppUrl(floatingWa.dataset.waMessage || '');
  }
}

function resolveDestinationImage(dest) {
  if (typeof window.haiboResolveCardImage === 'function') {
    return window.haiboResolveCardImage(dest);
  }
  if (typeof haiboResolveCardImage === 'function') {
    return haiboResolveCardImage(dest);
  }
  const pick =
    typeof haiboPickDestinationImage === 'function'
      ? haiboPickDestinationImage(dest)
      : dest?.image || '';
  if (typeof haiboSanitizeCmsMediaUrl === 'function') {
    return haiboSanitizeCmsMediaUrl(pick);
  }
  if (typeof haiboIsAdminUploadedUrl === 'function' && haiboIsAdminUploadedUrl(pick)) {
    return pick;
  }
  return '';
}

function escapeAttrUrl(url) {
  return String(url || '').replace(/'/g, '%27').replace(/"/g, '%22');
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

const PACKAGE_FEATURE_SVGS = [
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3l8 4v6c0 4.5-3.5 7.5-8 8-4.5-.5-8-3.5-8-8V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 10l8-6 8 6v10a1 1 0 01-1 1H5a1 1 0 01-1-1V10z"/><path d="M9 21v-6h6v6"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
];

function packageFeatureIconHtml(index) {
  return PACKAGE_FEATURE_SVGS[index % PACKAGE_FEATURE_SVGS.length];
}

function shortenFeatureLabel(text, max = 22) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  const words = t.split(/\s+/);
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > max) break;
    out = next;
  }
  return out || t.slice(0, max);
}

/** Premium package card — matches 2-col mobile reference (caption on image). */
function getDestinationGalleryImageUrl(item, dest, index) {
  if (typeof haiboResolveGalleryImage === 'function') {
    const resolved = haiboResolveGalleryImage(item, dest, index);
    if (resolved) return resolved;
  }
  const raw = typeof item === 'string' ? item : String(item?.url || item?.src || '').trim();
  if (typeof haiboValidMediaUrl === 'function' && haiboValidMediaUrl(raw)) {
    return raw;
  }
  return '';
}

function renderDestinationGalleryCard(item, dest, index) {
  const isVideo =
    (typeof item === 'object' && item?.type === 'video') ||
    String(item?.url || item?.src || '')
      .toLowerCase()
      .includes('/video/upload/');
  const mediaUrl = isVideo
    ? String(item?.url || item?.src || '').trim()
    : getDestinationGalleryImageUrl(item, dest, index);
  if (!mediaUrl || (typeof haiboValidMediaUrl === 'function' && !haiboValidMediaUrl(mediaUrl))) {
    return '';
  }
  const alt =
    (typeof item === 'object' && item?.alt) ||
    `${dest.name} safari ${isVideo ? 'video' : 'photo'} ${index + 1} — Tanzania`;
  const tag = dest.region || 'Safari';
  const title = dest.name || 'Safari';

  let mediaInner;
  if (isVideo) {
    mediaInner = `<video class="gallery-media-card__video haibo-media" src="${escapeAttrUrl(mediaUrl)}" muted playsinline loop preload="metadata"></video><span class="gallery-play-btn" aria-hidden="true">▶</span>`;
  } else {
    const imgSrc =
      typeof window.haiboOptimizeImage === 'function'
        ? window.haiboOptimizeImage(mediaUrl, { width: 720 })
        : mediaUrl;
    mediaInner =
      typeof window.haiboImgTag === 'function'
        ? window.haiboImgTag(imgSrc, alt, {
            width: 720,
            class: 'gallery-media-card__img',
          })
        : `<img src="${escapeAttrUrl(imgSrc)}" alt="${escapeHtml(alt)}" class="gallery-media-card__img" loading="lazy" decoding="async" width="480" height="640" />`;
  }

  return `
    <article class="gallery-media-card dest-gallery-card${isVideo ? ' gallery-video-card' : ''}">
      <div class="gallery-media-card__media">
        ${mediaInner}
        <div class="gallery-media-card__overlay" aria-hidden="true"></div>
        <div class="gallery-media-card__body">
          <p class="gallery-media-card__tag">${escapeHtml(tag)}</p>
          <h3 class="gallery-media-card__title">${escapeHtml(title)}</h3>
        </div>
      </div>
    </article>`;
}

function renderPackageCard(pkg, dest) {
  const imgRaw =
    typeof haiboSanitizeCmsMediaUrl === 'function'
      ? haiboSanitizeCmsMediaUrl(dest.cardImage || dest.image || dest.heroImage || '')
      : '';
  const imgSrc =
    imgRaw && typeof window.haiboOptimizeImage === 'function'
      ? window.haiboOptimizeImage(imgRaw, { width: 640 })
      : imgRaw;
  const imgTag = imgSrc
    ? typeof window.haiboImgTag === 'function'
      ? window.haiboImgTag(imgSrc, `${dest.name} safari — ${pkg.name}`, {
          width: 640,
          class: 'package-card__img',
        })
      : `<img src="${escapeAttrUrl(imgSrc)}" alt="${escapeHtml(`${dest.name} — ${pkg.name}`)}" class="package-card__img" loading="lazy" decoding="async" width="320" height="400" />`
    : '';
  const features = (pkg.features || []).slice(0, 4);
  const waHref = getWhatsAppUrl(
    `Hello HAIBO Tours! I'd like to book the "${pkg.name}" package for ${dest.name}. Please assist me with dates and payment options.`
  );

  return `
    <article class="package-card package-card--premium${pkg.popular ? ' popular' : ''}">
      <div class="package-card__media${imgTag ? '' : ' package-card__media--empty'}">
        ${imgTag}
        <div class="package-card__media-overlay" aria-hidden="true"></div>
        ${pkg.popular ? '<span class="package-card__badge"><span class="package-card__badge-star" aria-hidden="true">★</span> Most Popular</span>' : ''}
        <div class="package-card__caption">
          <h3 class="package-card__title">${escapeHtml(pkg.name)}</h3>
          <p class="package-card__duration">${escapeHtml(pkg.duration)}</p>
        </div>
      </div>
      <div class="package-card__body">
        <div class="package-card__pricing">
          <p class="package-card__price">${escapeHtml(pkg.price)}</p>
          ${pkg.priceNote ? `<p class="package-card__note">${escapeHtml(pkg.priceNote)}</p>` : ''}
        </div>
        ${
          features.length
            ? `<ul class="package-card__features" aria-label="Package highlights">
          ${features
            .map(
              (f, i) => `
            <li class="package-card__feature" title="${escapeHtml(f)}">
              <span class="package-card__feature-icon">${packageFeatureIconHtml(i)}</span>
              <span class="package-card__feature-text">${escapeHtml(shortenFeatureLabel(f))}</span>
            </li>`
            )
            .join('')}
        </ul>`
            : ''
        }
        <a href="${waHref}" target="_blank" rel="noopener noreferrer" class="package-card__cta btn-main">
          <span>Book This Package</span>
          <span class="package-card__cta-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </article>`;
}

function renderDestinationCard(dest) {
  if (typeof window.haiboBuildDestinationCard === 'function') {
    return window.haiboBuildDestinationCard(dest);
  }
  const href = destinationDetailUrl(dest.id);
  const imageUrl = resolveDestinationImage(dest);
  const title = escapeHtml(dest.name || '');
  const location = escapeHtml(dest.region || '');
  const description = escapeHtml(dest.subtitle || '');
  const duration =
    typeof haiboDestinationDurationLabel === 'function'
      ? haiboDestinationDurationLabel(dest)
      : '';
  const pricing =
    typeof haiboDestinationStartingPrice === 'function'
      ? haiboDestinationStartingPrice(dest)
      : null;
  const alt = `${dest.name || 'Safari'} — ${dest.subtitle || dest.region || 'Tanzania'} safari destination`;
  const imgSrc =
    typeof window.haiboOptimizeImage === 'function'
      ? window.haiboOptimizeImage(imageUrl, { width: 1100 })
      : imageUrl;
  const img = imageUrl
    ? `<img src="${escapeAttrUrl(imgSrc)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" class="haibo-media dest-card-catalog__img" width="1100" height="825">`
    : '';
  const priceHtml = pricing
    ? `<div class="dest-card-catalog__price"><span class="dest-card-catalog__price-label">From</span><strong class="dest-card-catalog__price-value">${escapeHtml(pricing.price)}</strong></div>`
    : `<div class="dest-card-catalog__price dest-card-catalog__price--empty"><span class="dest-card-catalog__price-label">From</span><strong class="dest-card-catalog__price-value">On request</strong></div>`;
  return `
    <a href="${href}" class="destination-card dest-card-catalog" aria-label="View details for ${title}">
      <div class="dest-card-catalog__media${imageUrl ? '' : ' dest-card-catalog__media--empty'}">
        ${img}
        <div class="dest-card-catalog__overlay" aria-hidden="true"></div>
        <div class="dest-card-catalog__content">
          <div class="dest-card-catalog__meta">
            ${location ? `<span class="dest-card-catalog__pill dest-card-catalog__pill--location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg><span>${location}</span></span>` : '<span></span>'}
            ${duration ? `<span class="dest-card-catalog__pill dest-card-catalog__pill--days"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17"/></svg><span>${escapeHtml(duration)}</span></span>` : ''}
          </div>
          <div class="dest-card-catalog__footer">
            <h3 class="dest-card-catalog__title">${title}</h3>
            ${description ? `<p class="dest-card-catalog__desc">${description}</p>` : ''}
            <div class="dest-card-catalog__bottom">
              ${priceHtml}
              <span class="dest-card-catalog__cta">View Details <span class="dest-card-catalog__cta-arrow" aria-hidden="true">→</span></span>
            </div>
          </div>
        </div>
      </div>
    </a>
  `;
}

function renderDestinationCards(containerId, limit) {
  if (typeof haiboPaintDestinationCards === 'function') {
    const ok = haiboPaintDestinationCards(containerId, limit);
    if (ok) {
      const container = document.getElementById(containerId);
      if (container && typeof window.haiboEnhanceImages === 'function') {
        window.haiboEnhanceImages(container);
      }
      return;
    }
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  let all = [];
  try {
    all = getDestinationsForUi();
  } catch (err) {
    console.warn('HAIBO renderDestinationCards:', err);
  }
  const list = limit ? all.slice(0, limit) : all;
  if (!list.length) {
    container.innerHTML =
      '<p class="haibo-empty-state" style="text-align:center;color:#9ca3af;padding:2rem">Destinations will appear here once published in the CMS.</p>';
    return;
  }
  container.innerHTML = list.map(renderDestinationCard).join('');
  container.dataset.haiboRendered = '1';
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

const DEST_DETAIL_PIN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';

const DEST_DETAIL_CAL_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17"/></svg>';

const DEST_DETAIL_BOOK_CAL_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17"/></svg>';

const DEST_DETAIL_ARROW_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

const DEST_INCLUDED_ICONS = [
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4v6c0 4.5-3.5 7.5-8 8-4.5-.5-8-3.5-8-8V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l7-12 4 7 3-5 4 10H3z"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10l8-6 8 6v10a1 1 0 01-1 1H5a1 1 0 01-1-1V10z"/><path d="M9 21v-6h6v6"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16"/><path d="M7 8h2v8H7zM15 8h2v8h-2z"/><path d="M4 16h16"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="5"/><circle cx="15" cy="14" r="4"/><path d="M13.5 12.5l5.5 5.5"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16l1.5-5h11L19 16"/><path d="M7 16v3M17 16v3"/><circle cx="8.5" cy="19" r="1.5"/><circle cx="15.5" cy="19" r="1.5"/><path d="M3 11h3l1-3h10"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s5 5.2 5 9a5 5 0 11-10 0c0-3.8 5-9 5-9z"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l2 3v15H5V6l2-3z"/><path d="M9 11h6M9 15h6"/></svg>',
];

const DEST_TAB_ICONS = {
  included:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.2 2.2 4.8-5"/></svg>',
  excluded:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
  itinerary:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17"/></svg>',
  map:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M9 4.5l-5.5 2v13l5.5-2 6 2 5.5-2v-13L15 6.5 9 4.5z"/><path d="M9 4.5v13M15 6.5v13"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v5M12 7.75h.01"/></svg>',
};

function includedFeatureIcon(text, index) {
  const t = String(text || '').toLowerCase();
  if (/park|fee|permit|vat|tax/.test(t)) return DEST_INCLUDED_ICONS[0];
  if (/guide|english|ranger|driver/.test(t)) return DEST_INCLUDED_ICONS[1];
  if (/airport|flight|transfer|pickup|pick-up|transport/.test(t)) return DEST_INCLUDED_ICONS[2];
  if (/accommodation|lodge|camp|hotel|hut|stay/.test(t)) return DEST_INCLUDED_ICONS[3];
  if (/meal|breakfast|lunch|dinner|food/.test(t)) return DEST_INCLUDED_ICONS[4];
  if (/game|drive|binocular|wildlife|safari/.test(t)) return DEST_INCLUDED_ICONS[5];
  if (/vehicle|4x4|4×4|jeep|car/.test(t)) return DEST_INCLUDED_ICONS[6];
  if (/water|drink|bottle/.test(t)) return DEST_INCLUDED_ICONS[7];
  if (/tax|vat|document|government/.test(t)) return DEST_INCLUDED_ICONS[8];
  if (/visa|insurance|tip|optional|personal|international/.test(t)) return DEST_TAB_ICONS.excluded;
  return DEST_INCLUDED_ICONS[index % DEST_INCLUDED_ICONS.length];
}

function resolveMapEmbedSrc(mapUrl, mapQuery) {
  const url = String(mapUrl || '').trim();
  if (url) {
    if (/google\.[^/]+\/maps\/embed/i.test(url) || /output=embed/i.test(url)) return url;
    if (/google\.[^/]+\/maps/i.test(url)) {
      try {
        const u = new URL(url);
        if (!u.searchParams.has('output')) u.searchParams.set('output', 'embed');
        return u.toString();
      } catch (_) {
        return url;
      }
    }
    return url;
  }
  const q = String(mapQuery || 'Tanzania').trim();
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=7&output=embed`;
}

function renderFeatureListHtml(items, emptyMessage) {
  if (!items.length) {
    return `<p class="dest-detail-tabs__empty">${escapeHtml(emptyMessage)}</p>`;
  }
  return `<ul class="dest-detail-tabs__features">
    ${items
      .map(
        (item, i) => `
      <li class="dest-detail-tabs__feature">
        <span class="dest-detail-tabs__feature-icon" aria-hidden="true">${includedFeatureIcon(item.title, i)}</span>
        <div class="dest-detail-tabs__feature-copy">
          <p class="dest-detail-tabs__feature-title">${escapeHtml(item.title)}</p>
          ${item.detail ? `<p class="dest-detail-tabs__feature-detail">${escapeHtml(item.detail)}</p>` : ''}
        </div>
      </li>`
      )
      .join('')}
  </ul>`;
}

function renderItineraryHtml(steps) {
  if (!steps.length) {
    return '<p class="dest-detail-tabs__empty">Itinerary details will appear here once published in the CMS.</p>';
  }
  return `<ol class="dest-detail-tabs__itinerary">
    ${steps
      .map(
        (step) => `
      <li class="dest-detail-tabs__day">
        <div class="dest-detail-tabs__day-rail" aria-hidden="true"></div>
        <div class="dest-detail-tabs__day-body">
          <p class="dest-detail-tabs__day-label">${escapeHtml(step.day)}</p>
          ${step.title ? `<p class="dest-detail-tabs__day-title">${escapeHtml(step.title)}</p>` : ''}
          ${step.text ? `<p class="dest-detail-tabs__day-text">${escapeHtml(step.text)}</p>` : ''}
        </div>
      </li>`
      )
      .join('')}
  </ol>`;
}

function renderMapOverviewHtml(overview, mapSrc) {
  return `<div class="dest-detail-tabs__map-grid">
    <div class="dest-detail-tabs__map-frame">
      <iframe
        title="Destination map"
        src="${escapeAttrUrl(mapSrc)}"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
      ></iframe>
    </div>
    <div class="dest-detail-tabs__overview">
      <h3 class="dest-detail-tabs__panel-title">Overview</h3>
      <p class="dest-detail-tabs__overview-text">${
        overview
          ? escapeHtml(overview)
          : 'Overview will appear here once published in the CMS.'
      }</p>
    </div>
  </div>`;
}

function renderImportantHtml(rows) {
  if (!rows.length) {
    return '<p class="dest-detail-tabs__empty">Important information will appear here once published in the CMS.</p>';
  }
  return `<dl class="dest-detail-tabs__info">
    ${rows
      .map(
        (row) => `
      <div class="dest-detail-tabs__info-row">
        <dt>${escapeHtml(row.label)}</dt>
        <dd>${escapeHtml(row.value)}</dd>
      </div>`
      )
      .join('')}
  </dl>`;
}

function buildDestDetailTabsHtml(dest) {
  const included =
    typeof haiboDestinationIncludedFeatures === 'function'
      ? haiboDestinationIncludedFeatures(dest)
      : [];
  const excluded =
    typeof haiboDestinationExcludedFeatures === 'function'
      ? haiboDestinationExcludedFeatures(dest)
      : [];
  const itinerary =
    typeof haiboDestinationItinerary === 'function' ? haiboDestinationItinerary(dest) : [];
  const overview =
    typeof haiboDestinationOverview === 'function' ? haiboDestinationOverview(dest) : '';
  const mapUrl =
    typeof haiboDestinationMapUrl === 'function' ? haiboDestinationMapUrl(dest) : '';
  const mapQuery =
    typeof haiboDestinationMapQuery === 'function' ? haiboDestinationMapQuery(dest) : '';
  const important =
    typeof haiboDestinationImportantInfo === 'function'
      ? haiboDestinationImportantInfo(dest)
      : [];
  const mapSrc = resolveMapEmbedSrc(mapUrl, mapQuery);

  const tabs = [
    { id: 'included', label: "What's Included", icon: DEST_TAB_ICONS.included },
    { id: 'excluded', label: "What's Excluded", icon: DEST_TAB_ICONS.excluded },
    { id: 'itinerary', label: 'Itinerary', icon: DEST_TAB_ICONS.itinerary },
    { id: 'map', label: 'Map & Overview', icon: DEST_TAB_ICONS.map },
    { id: 'info', label: 'Important Information', icon: DEST_TAB_ICONS.info },
  ];

  const panels = {
    included: `<h3 class="dest-detail-tabs__panel-title">What's Included</h3>
      <span class="dest-detail-tabs__accent" aria-hidden="true"></span>
      ${renderFeatureListHtml(included, 'Inclusions will appear here once published in the CMS.')}`,
    excluded: `<h3 class="dest-detail-tabs__panel-title">What's Excluded</h3>
      <span class="dest-detail-tabs__accent" aria-hidden="true"></span>
      ${renderFeatureListHtml(excluded, 'Exclusions will appear here once published in the CMS.')}`,
    itinerary: `<h3 class="dest-detail-tabs__panel-title">Itinerary</h3>
      <span class="dest-detail-tabs__accent" aria-hidden="true"></span>
      ${renderItineraryHtml(itinerary)}`,
    map: renderMapOverviewHtml(overview, mapSrc),
    info: `<h3 class="dest-detail-tabs__panel-title">Important Information</h3>
      <span class="dest-detail-tabs__accent" aria-hidden="true"></span>
      ${renderImportantHtml(important)}`,
  };

  return `
    <section class="dest-detail-tabs" aria-label="Package information">
      <div class="dest-detail-tabs__shell">
        <div class="dest-detail-tabs__nav" role="tablist" aria-label="Package details">
          ${tabs
            .map(
              (tab, i) => `
            <button
              type="button"
              class="dest-detail-tabs__tab${i === 0 ? ' is-active' : ''}"
              role="tab"
              id="dest-tab-${tab.id}"
              aria-selected="${i === 0 ? 'true' : 'false'}"
              aria-controls="dest-panel-${tab.id}"
              data-dest-tab="${tab.id}"
            >
              <span class="dest-detail-tabs__tab-icon" aria-hidden="true">${tab.icon}</span>
              <span class="dest-detail-tabs__tab-label">${escapeHtml(tab.label)}</span>
            </button>`
            )
            .join('')}
        </div>
        <div class="dest-detail-tabs__panels">
          ${tabs
            .map(
              (tab, i) => `
            <div
              class="dest-detail-tabs__panel${i === 0 ? ' is-active' : ''}"
              role="tabpanel"
              id="dest-panel-${tab.id}"
              aria-labelledby="dest-tab-${tab.id}"
              data-dest-panel="${tab.id}"
              ${i === 0 ? '' : 'hidden'}
            >${panels[tab.id]}</div>`
            )
            .join('')}
        </div>
      </div>
    </section>`;
}

function initDestDetailTabs(root) {
  const section = root?.querySelector('.dest-detail-tabs');
  if (!section) return;
  const tabs = [...section.querySelectorAll('[data-dest-tab]')];
  const panels = [...section.querySelectorAll('[data-dest-panel]')];

  function activate(id) {
    tabs.forEach((tab) => {
      const active = tab.dataset.destTab === id;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach((panel) => {
      const active = panel.dataset.destPanel === id;
      panel.classList.toggle('is-active', active);
      if (active) {
        panel.hidden = false;
        panel.classList.remove('is-entering');
        void panel.offsetWidth;
        panel.classList.add('is-entering');
      } else {
        panel.hidden = true;
        panel.classList.remove('is-entering');
      }
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab.dataset.destTab));
  });
}

function renderDestinationDetail() {
  const root = document.getElementById('detail-root');
  if (!root) return;

  if (!window.HAIBO_CONTENT_LOADED) {
    root.innerHTML =
      '<section class="py-32 px-8 text-center text-white/50" aria-busy="true">Loading destination…</section>';
    return;
  }

  const id =
    typeof getDestinationIdFromLocation === 'function'
      ? getDestinationIdFromLocation()
      : getQueryParam('id');
  const dest = getDestinationById(id);

  if (!dest) {
    const draft =
      typeof getFirestoreDestinationById === 'function'
        ? getFirestoreDestinationById(id)
        : null;
    const draftHint =
      draft && (draft.active === false || draft.status === 'draft')
        ? '<p class="text-white/50 mb-4">This destination is saved as <strong>Draft</strong> in the admin panel. Turn on <strong>Published</strong> and save to show it on the website.</p>'
        : '<p class="text-white/50 mb-8">The page you\'re looking for doesn\'t exist or the link uses an old address. Check the spelling or pick a destination from the list.</p>';

    root.innerHTML = `
      <section class="py-32 px-8 text-center">
        <h1 class="text-4xl font-bold mb-4 text-white">Destination not available</h1>
        ${draftHint}
        <a href="destinations.html" class="btn-main px-8 py-4 rounded-full">View All Destinations</a>
      </section>
    `;
    return;
  }

  if (typeof window.haiboApplyDestinationSEO === 'function') {
    window.haiboApplyDestinationSEO(dest);
  } else {
    document.title = `${dest.name} Safari | HAIBO Tours & Safaris`;
  }

  const location = String(dest.region || '').trim();
  const duration =
    typeof haiboDestinationDurationLabel === 'function'
      ? haiboDestinationDurationLabel(dest)
      : '';
  const heroTitle =
    typeof haiboDestinationHeroTitle === 'function'
      ? haiboDestinationHeroTitle(dest)
      : dest.name;
  const heroSubtitle =
    typeof haiboDestinationHeroSubtitle === 'function'
      ? haiboDestinationHeroSubtitle(dest)
      : String(dest.subtitle || '').toUpperCase();
  const pricing =
    typeof haiboDestinationStartingPrice === 'function'
      ? haiboDestinationStartingPrice(dest)
      : null;

  let heroRaw =
    typeof haiboResolveHeroImage === 'function'
      ? haiboResolveHeroImage(dest)
      : typeof haiboSanitizeCmsMediaUrl === 'function'
        ? haiboSanitizeCmsMediaUrl(dest.heroImage || dest.image || '')
        : dest.heroImage || dest.image || '';
  const heroImg =
    heroRaw && typeof window.haiboOptimizeImage === 'function'
      ? window.haiboOptimizeImage(heroRaw, { width: 1920 })
      : heroRaw;

  const waMessage = `Hello HAIBO Tours! I'm interested in the ${dest.name}${duration ? ` (${duration})` : ''} package. Please share details and availability.`;
  initWhatsAppFloat(waMessage);
  const bookHref = getWhatsAppUrl(waMessage);

  const locationPill = location
    ? `<span class="dest-detail-hero__pill">${DEST_DETAIL_PIN_SVG}<span>${escapeHtml(location)}</span></span>`
    : '';
  const durationPill = duration
    ? `<span class="dest-detail-hero__pill">${DEST_DETAIL_CAL_SVG}<span>${escapeHtml(duration)}</span></span>`
    : '';

  const priceHtml = pricing
    ? `<div class="dest-detail-price__row">
        <span class="dest-detail-price__value">${escapeHtml(pricing.price)}</span>
        <span class="dest-detail-price__note">${escapeHtml(pricing.note)}</span>
      </div>`
    : '<p class="dest-detail-price__empty">Contact us for pricing</p>';

  const alt = `${dest.name}${location ? ` — ${location}` : ''} safari destination`;
  const tabsHtml = buildDestDetailTabsHtml(dest);

  root.innerHTML = `
    <section class="dest-detail-hero" aria-label="${escapeHtml(dest.name)}">
      <div class="dest-detail-hero__media${heroImg ? '' : ' dest-detail-hero__media--empty'}">
        ${
          heroImg
            ? `<img class="dest-detail-hero__img haibo-media" src="${escapeAttrUrl(heroImg)}" alt="${escapeHtml(alt)}" width="1920" height="1080" decoding="async" fetchpriority="high">`
            : ''
        }
        <div class="dest-detail-hero__overlay" aria-hidden="true"></div>
      </div>
      <div class="dest-detail-hero__content">
        <div class="dest-detail-hero__pills">
          ${locationPill}
          ${durationPill}
        </div>
        <h1 class="dest-detail-hero__title">${escapeHtml(heroTitle)}</h1>
        ${heroSubtitle ? `<p class="dest-detail-hero__subtitle">${escapeHtml(heroSubtitle)}</p>` : ''}
      </div>
    </section>

    <div class="dest-detail-body">
      <div class="dest-detail-body__inner">
        <section class="dest-detail-price" aria-label="Starting price">
          <p class="dest-detail-price__label">Price From</p>
          ${priceHtml}
        </section>

        ${tabsHtml}

        <div class="dest-detail-book">
          <a
            href="${escapeAttrUrl(bookHref)}"
            target="_blank"
            rel="noopener noreferrer"
            class="dest-detail-book__btn"
          >
            <span class="dest-detail-book__icon" aria-hidden="true">${DEST_DETAIL_BOOK_CAL_SVG}</span>
            <span>Book This Package</span>
            <span class="dest-detail-book__arrow" aria-hidden="true">${DEST_DETAIL_ARROW_SVG}</span>
          </a>
        </div>
      </div>
    </div>
  `;

  initDestDetailTabs(root);

  if (typeof window.haiboEnhanceImages === 'function') {
    window.haiboEnhanceImages(root);
  }
}


function runHaiboApp() {
  applyLogo();
  if (typeof window.applyHaiboContent === 'function') {
    window.applyHaiboContent();
  }
  syncWhatsAppLinks();
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
    if (typeof window.haiboEnhanceImages === 'function') {
      window.haiboEnhanceImages(document.getElementById('home-destinations'));
    }
    if (typeof window.refreshHaiboWeatherWidget === 'function') {
      window.refreshHaiboWeatherWidget();
    } else if (typeof initWeatherWidget === 'function') {
      initWeatherWidget();
    }
  }

  if (document.body.dataset.page === 'destinations') {
    initWhatsAppFloat();
    renderDestinationCards('all-destinations');
    if (typeof window.haiboEnhanceImages === 'function') {
      window.haiboEnhanceImages(document.getElementById('all-destinations'));
    }
  }

  if (document.body.dataset.page === 'destination-detail') {
    renderDestinationDetail();
  } else if (!document.getElementById('whatsapp-float')) {
    initWhatsAppFloat();
  }
}

function refreshHaiboLiveContent() {
  if (typeof syncHaiboDestinations === 'function') syncHaiboDestinations();
  if (typeof window.applyHaiboContent === 'function') {
    window.applyHaiboContent();
  }
  applyLogo();
  syncWhatsAppLinks();

  if (document.body.dataset.page === 'home') {
    renderDestinationCards('home-destinations', 4);
    if (typeof haiboBootDestinationGrids === 'function') haiboBootDestinationGrids();
    initSearchBar();
    if (typeof window.refreshHaiboWeatherWidget === 'function') {
      window.refreshHaiboWeatherWidget();
    }
  }
  if (document.body.dataset.page === 'destinations') {
    renderDestinationCards('all-destinations');
    if (typeof haiboBootDestinationGrids === 'function') haiboBootDestinationGrids();
  }
  if (document.body.dataset.page === 'destination-detail') {
    renderDestinationDetail();
  }
  if (document.body.dataset.page === 'gallery' && typeof renderGalleryPage === 'function') {
    renderGalleryPage();
  }
  if (document.body.dataset.page === 'contact') {
    initContactPage();
  }
}

function primeHaiboLocalContent() {
  if (typeof mergeHaiboContentWithDefaults === 'function') {
    mergeHaiboContentWithDefaults();
  }
  if (
    typeof syncHaiboDestinations === 'function' &&
    (window.HAIBO_CONTENT?.destinations?.length || window.HAIBO_FIRESTORE_DESTINATIONS?.length)
  ) {
    syncHaiboDestinations();
  }
}

function bootHaiboApp() {
  primeHaiboLocalContent();
  runHaiboApp();

  if (!window.HAIBO_CONTENT_LOADED) {
    window.addEventListener(
      'haiboContentReady',
      () => {
        primeHaiboLocalContent();
        refreshHaiboLiveContent();
      },
      { once: true }
    );
  }
  window.addEventListener('haiboContentUpdated', refreshHaiboLiveContent);
}

window.refreshHaiboLiveContent = refreshHaiboLiveContent;

document.addEventListener('DOMContentLoaded', bootHaiboApp);
