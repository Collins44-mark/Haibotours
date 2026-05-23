/**
 * HAIBO Admin — shared UI (toast, modal, menus, save bar).
 */
import { adminToast } from './admin-db.mjs';

export function showToast(message, type = 'info') {
  adminToast(message, type);
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const saas = Boolean(document.getElementById('haibo-toast') || document.querySelector('.haibo-admin'));
    const backdrop = document.createElement('div');
    backdrop.className = saas ? 'haibo-modal-backdrop is-open' : 'admin-modal-backdrop is-open';
    const cancelCls = saas ? 'haibo-btn haibo-btn--ghost' : 'admin-btn admin-btn--ghost';
    const okCls = saas
      ? `haibo-btn ${danger ? 'haibo-btn--danger' : 'haibo-btn--primary'}`
      : `admin-btn ${danger ? 'admin-btn--danger' : 'admin-btn--primary'}`;
    backdrop.innerHTML = `
      <div class="${saas ? 'haibo-modal' : 'admin-modal'}" role="dialog" aria-modal="true">
        <h3 style="margin:0 0 0.5rem">${title}</h3>
        <p style="margin:0 0 1.25rem;color:#9ca3af;font-size:0.9rem">${message}</p>
        <div style="display:flex;gap:0.5rem;justify-content:flex-end">
          <button type="button" class="${cancelCls}" data-modal-cancel>Cancel</button>
          <button type="button" class="${okCls}" data-modal-ok>${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    const close = (val) => {
      backdrop.classList.remove('is-open');
      setTimeout(() => backdrop.remove(), 200);
      resolve(val);
    };
    backdrop.querySelector('[data-modal-cancel]')?.addEventListener('click', () => close(false));
    backdrop.querySelector('[data-modal-ok]')?.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
  });
}

export function initTopbarMenu() {
  const btn = document.getElementById('btn-actions-menu');
  const menu = document.getElementById('admin-actions-dropdown');
  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.addEventListener('click', () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  });
}

export function setSaveStatus(text, state = 'idle') {
  const el = document.getElementById('admin-save-status');
  if (!el) return;
  el.dataset.state = state;
  el.textContent = text;
}

export function bindUnsavedWarning(getDirty) {
  window.addEventListener('beforeunload', (e) => {
    if (getDirty?.()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

export function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function initMobileSidebar() {
  const btn = document.getElementById('btn-menu');
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!btn || !sidebar) return;

  const close = () => {
    sidebar.classList.remove('is-open');
    backdrop?.classList.remove('is-visible');
    document.body.classList.remove('admin-sidebar-open');
  };

  btn.addEventListener('click', () => {
    const open = sidebar.classList.toggle('is-open');
    backdrop?.classList.toggle('is-visible', open);
    document.body.classList.toggle('admin-sidebar-open', open);
  });
  backdrop?.addEventListener('click', close);
  document.querySelectorAll('.admin-nav__btn[data-panel]').forEach((btn) => {
    btn.addEventListener('click', close);
  });
}
