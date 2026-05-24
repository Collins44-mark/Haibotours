/**
 * Destinations list page — mockup layout.
 */
import { protectAdminPage } from './admin-gate.mjs';
import { renderSidebar, initSidebar, userDisplayFromAuth, closeAllMenus } from './admin-layout.mjs';
import {
  mergeDestinationsForAdmin,
  destinationEditUrl,
  saveDestinationRecord,
  deleteDestinationById,
} from './admin-destinations.mjs';
import { loadAdminCms } from './admin-cms.mjs';
import { confirmDialog, formatRelativeTime } from './admin-ui.mjs';
import { adminToast } from './admin-db.mjs';
import { signOutAdmin, LOGIN_URL } from './firebase.js';

const PAGE_SIZE = 5;
let allDestinations = [];
let page = 1;
let booted = false;

function showToast(msg, type = 'info') {
  adminToast(msg, type);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function getFiltered() {
  const q = document.getElementById('dest-search')?.value?.trim().toLowerCase() || '';
  const region = document.getElementById('filter-region')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';
  const sort = document.getElementById('sort-by')?.value || 'updated';

  let list = [...allDestinations];
  if (q) {
    list = list.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.id?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
    );
  }
  if (region) list = list.filter((d) => d.region === region);
  if (status === 'published') list = list.filter((d) => d.active !== false);
  if (status === 'draft') list = list.filter((d) => d.active === false);

  if (sort === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sort === 'order') list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  else list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return list;
}

function viewDestinationUrl(id) {
  const local =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return local ? `/destination.html?id=${encodeURIComponent(id)}` : `/destinations/${id}`;
}

function renderList() {
  const listEl = document.getElementById('dest-list');
  const pagEl = document.getElementById('dest-pagination');
  const filtered = getFiltered();
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) page = pages;
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!slice.length) {
    listEl.innerHTML = `<div class="haibo-empty"><p>No destinations found.</p><a href="${destinationEditUrl('')}" class="haibo-btn haibo-btn--primary" style="margin-top:1rem">+ Add Destination</a></div>`;
    pagEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = slice
    .map((d) => {
      const published = d.active !== false;
      const badge = published
        ? '<span class="haibo-badge haibo-badge--published">Published</span>'
        : '<span class="haibo-badge haibo-badge--draft">Draft</span>';
      const img = d.image || d.heroImage || '';
      const desc = (d.description || d.subtitle || '').slice(0, 120);
      return `
      <article class="haibo-dest-row" data-id="${escapeHtml(d.id)}">
        <div class="haibo-dest-row__thumb">
          ${img ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" />` : ''}
        </div>
        <div class="haibo-dest-row__body">
          <h3>${escapeHtml(d.name)}</h3>
          <p class="haibo-dest-row__meta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8 6 4 8 4 13a8 8 0 1016 0"/></svg>
            ${escapeHtml(d.region || 'Tanzania')}
          </p>
          <p class="haibo-dest-row__desc">${escapeHtml(desc)}${desc.length >= 120 ? '…' : ''}</p>
          <p class="haibo-dest-row__time">Updated ${formatRelativeTime(d.updatedAt)}</p>
        </div>
        <div class="haibo-dest-row__side">
          ${badge}
          <div class="haibo-menu-wrap">
            <button type="button" class="haibo-icon-btn" data-menu-toggle aria-label="Actions">⋯</button>
            <div class="haibo-menu" hidden>
              <a href="${destinationEditUrl(d.id)}">✎ Edit</a>
              <button type="button" data-action="duplicate" data-id="${escapeHtml(d.id)}">⧉ Duplicate</button>
              <a href="${viewDestinationUrl(d.id)}" target="_blank" rel="noopener">↗ View</a>
              <button type="button" data-action="delete" data-id="${escapeHtml(d.id)}">🗑 Delete</button>
            </div>
          </div>
        </div>
      </article>`;
    })
    .join('');

  listEl.querySelectorAll('[data-menu-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllMenus();
      const menu = btn.nextElementSibling;
      if (menu) menu.hidden = !menu.hidden;
    });
  });

  listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      closeAllMenus();
      const ok = await confirmDialog({
        title: 'Delete destination?',
        message: `Remove "${btn.dataset.id}" from the live website.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
      await deleteDestinationById(btn.dataset.id);
      allDestinations = mergeDestinationsForAdmin();
      renderList();
      showToast('Destination deleted', 'success');
    });
  });

  listEl.querySelectorAll('[data-action="duplicate"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      closeAllMenus();
      const src = allDestinations.find((d) => d.id === btn.dataset.id);
      if (!src) return;
      const newId = `${src.id}-copy-${Date.now().toString(36).slice(-4)}`;
      const copy = { ...src, id: newId, name: `${src.name} (Copy)`, active: false };
      delete copy._source;
      await saveDestinationRecord(copy);
      showToast('Destination duplicated', 'success');
      window.location.href = destinationEditUrl(newId);
    });
  });

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  pagEl.innerHTML = `
    <span>Showing ${start} to ${end} of ${total} destinations</span>
    <div class="haibo-pagination__nums">
      ${Array.from({ length: pages }, (_, i) => i + 1)
        .map(
          (n) =>
            `<button type="button" data-page="${n}" class="${n === page ? 'is-active' : ''}">${n}</button>`
        )
        .join('')}
    </div>`;
  pagEl.querySelectorAll('[data-page]').forEach((b) => {
    b.addEventListener('click', () => {
      page = Number(b.dataset.page);
      renderList();
    });
  });
}

function fillRegionFilter() {
  const sel = document.getElementById('filter-region');
  if (!sel || sel.options.length > 2) return;
  const regions = [...new Set(allDestinations.map((d) => d.region).filter(Boolean))].sort();
  regions.forEach((r) => {
    const o = document.createElement('option');
    o.value = r;
    o.textContent = r;
    sel.appendChild(o);
  });
}

function bindFilters() {
  ['dest-search', 'filter-region', 'filter-status', 'sort-by'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      page = 1;
      renderList();
    });
    document.getElementById(id)?.addEventListener('change', () => {
      page = 1;
      renderList();
    });
  });
}

async function loadDestinationsList() {
  await loadAdminCms();
  allDestinations = mergeDestinationsForAdmin();
  fillRegionFilter();
  renderList();
}

async function boot(user) {
  if (booted) return;
  booted = true;

  const app = document.getElementById('app');
  if (app) app.hidden = false;

  renderSidebar(document.getElementById('sidebar-mount'), 'destinations', userDisplayFromAuth(user));
  initSidebar();

  document.getElementById('top-profile').textContent = userDisplayFromAuth(user).initials;
  document.getElementById('btn-logout-sidebar')?.addEventListener('click', async () => {
    await signOutAdmin();
    window.location.replace(LOGIN_URL);
  });
  document.getElementById('btn-more')?.addEventListener('click', async () => {
    const { seedAllDefaults } = await import('./admin-app.mjs');
    await seedAllDefaults();
  });
  document.getElementById('btn-menu-mobile')?.addEventListener('click', () => {
    document.getElementById('haibo-sidebar')?.classList.toggle('is-open');
  });

  bindFilters();
  await loadDestinationsList();
}

protectAdminPage((user) => boot(user));
