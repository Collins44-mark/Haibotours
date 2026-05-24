/**
 * Shared HAIBO CMS shell — sidebar, nav, collapse.
 */
const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  destinations: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8 6 4 8 4 13a8 8 0 1016 0c0-5-4-7-8-11z"/></svg>',
  packages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>',
  gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 17l-5-5L5 19"/></svg>',
  reviews: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg>',
  collapse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
};

const NAV = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard.html', icon: 'dashboard' },
  { group: 'Content' },
  { id: 'destinations', label: 'Destinations', href: '/admin/destinations/index.html', icon: 'destinations' },
  { id: 'gallery', label: 'Gallery', href: '/admin/dashboard.html#gallery', icon: 'gallery' },
  { id: 'reviews', label: 'Reviews', href: '/admin/dashboard.html#reviews', icon: 'reviews' },
  { group: 'Settings' },
  { id: 'settings', label: 'Settings', href: '/admin/dashboard.html#settings', icon: 'settings' },
];

export function userDisplayFromAuth(user) {
  const email = user?.email || 'admin@haibotours.com';
  const name = email.split('@')[0].replace(/[._]/g, ' ');
  const display = name.charAt(0).toUpperCase() + name.slice(1);
  const initials = display
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return { email, display, initials };
}

export function renderSidebar(container, activeId, user) {
  const u = user || { display: 'Admin', email: 'admin@haibotours.com', initials: 'AU' };
  const navHtml = NAV.map((item) => {
    if (item.group) return `<div class="haibo-nav__group haibo-nav__label">${item.group}</div>`;
    const active = item.id === activeId ? ' is-active' : '';
    return `<a href="${item.href}" class="haibo-nav__link${active}" data-nav="${item.id}">${ICONS[item.icon] || ''}<span class="haibo-nav__label">${item.label}</span></a>`;
  }).join('');

  container.innerHTML = `
    <aside class="haibo-sidebar" id="haibo-sidebar">
      <div class="haibo-sidebar__brand">
        <img src="/assets/logo/logo.png" alt="HAIBO" width="40" height="40" />
        <div class="haibo-sidebar__text">
          <strong>HAIBO</strong>
          <span>TOURS &amp; SAFARIS</span>
        </div>
      </div>
      <nav class="haibo-nav" aria-label="CMS">${navHtml}</nav>
      <div class="haibo-sidebar__foot">
        <div class="haibo-user">
          <div class="haibo-user__avatar" id="sidebar-avatar">${u.initials}</div>
          <div class="haibo-user__info haibo-sidebar__text">
            <strong>${u.display}</strong>
            <span id="sidebar-email">${u.email}</span>
          </div>
        </div>
        <button type="button" class="haibo-collapse" id="btn-sidebar-collapse">${ICONS.collapse}<span>Collapse</span></button>
        <button type="button" class="haibo-nav__link" id="btn-logout-sidebar" style="margin-top:0.5rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          <span class="haibo-nav__label">Logout</span>
        </button>
      </div>
    </aside>`;
}

function ensureHaiboSidebarBackdrop() {
  let backdrop = document.getElementById('haibo-sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'haibo-sidebar-backdrop';
    backdrop.className = 'haibo-sidebar-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

export function initSidebar() {
  const sidebar = document.getElementById('haibo-sidebar');
  const collapseBtn = document.getElementById('btn-sidebar-collapse');
  const backdrop = ensureHaiboSidebarBackdrop();
  const stored = localStorage.getItem('haibo_sidebar_collapsed') === '1';

  if (stored && window.matchMedia('(min-width: 901px)').matches) {
    sidebar?.classList.add('is-collapsed');
  }

  collapseBtn?.addEventListener('click', () => {
    if (!window.matchMedia('(min-width: 901px)').matches) return;
    sidebar?.classList.toggle('is-collapsed');
    localStorage.setItem('haibo_sidebar_collapsed', sidebar?.classList.contains('is-collapsed') ? '1' : '0');
  });

  const closeMobile = () => {
    sidebar?.classList.remove('is-open');
    backdrop?.classList.remove('is-visible');
    document.body.classList.remove('haibo-sidebar-open');
  };

  const menuBtn = document.getElementById('btn-menu-mobile');
  menuBtn?.addEventListener('click', () => {
    const open = sidebar?.classList.toggle('is-open');
    backdrop?.classList.toggle('is-visible', Boolean(open));
    document.body.classList.toggle('haibo-sidebar-open', Boolean(open));
  });

  backdrop?.addEventListener('click', closeMobile);
  sidebar?.querySelectorAll('.haibo-nav__link[href]').forEach((link) => {
    link.addEventListener('click', closeMobile);
  });
}

export function closeAllMenus() {
  document.querySelectorAll('.haibo-menu').forEach((m) => {
    m.hidden = true;
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.haibo-menu-wrap')) closeAllMenus();
});
