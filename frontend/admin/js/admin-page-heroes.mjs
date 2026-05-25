/**
 * Admin — per-page hero backgrounds & captions
 */
import { cloudinaryUpload } from './admin-cloudinary.mjs';
import { adminToast, sanitizeFirestoreData } from './admin-db.mjs';
import { getAdminCms } from './admin-cms.mjs';
import { saveSectionToFirestore } from './admin-cms.mjs';
import {
  PAGE_HERO_PAGE_IDS,
  PAGE_HERO_META,
  defaultPageHeroPages,
  heroFirestorePayloadFromPageHeroes,
  normalizePageHeroesDoc,
} from '../../js/page-heroes.mjs';

let activePageId = 'home';
let uploadInProgress = false;

function defaultsForPage(id) {
  return { ...defaultPageHeroPages()[id] };
}

function getPageHeroesCms() {
  const cms = getAdminCms();
  if (!cms.pageHeroes?.pages) {
    cms.pageHeroes = normalizePageHeroesDoc(null, cms.hero);
  }
  return cms.pageHeroes;
}

function pageFromForm(form, pageId) {
  const meta = PAGE_HERO_META[pageId];
  const row = {
    eyebrow: form.eyebrow?.value?.trim() || '',
    title: form.title?.value?.trim() || '',
    titleAccent: form.titleAccent?.value?.trim() || '',
    subtitle: form.subtitle?.value?.trim() || '',
    backgroundImageUrl: form.backgroundImageUrl?.value?.trim() || '',
  };
  if (meta?.hasCta) {
    row.ctaPrimaryText = form.ctaPrimaryText?.value?.trim() || '';
    row.ctaPrimaryLink = form.ctaPrimaryLink?.value?.trim() || '';
    row.ctaSecondaryText = form.ctaSecondaryText?.value?.trim() || '';
    row.ctaSecondaryLink = form.ctaSecondaryLink?.value?.trim() || '';
  }
  return row;
}

function fillForm(form, data, pageId) {
  const d = { ...defaultsForPage(pageId), ...data };
  if (form.eyebrow) form.eyebrow.value = d.eyebrow || '';
  if (form.title) form.title.value = d.title || '';
  if (form.titleAccent) form.titleAccent.value = d.titleAccent || '';
  if (form.subtitle) form.subtitle.value = d.subtitle || '';
  if (form.backgroundImageUrl) form.backgroundImageUrl.value = d.backgroundImageUrl || '';
  const ctaBlock = form.querySelector('[data-page-hero-cta-fields]');
  if (ctaBlock) ctaBlock.hidden = !PAGE_HERO_META[pageId]?.hasCta;
  if (PAGE_HERO_META[pageId]?.hasCta) {
    if (form.ctaPrimaryText) form.ctaPrimaryText.value = d.ctaPrimaryText || '';
    if (form.ctaPrimaryLink) form.ctaPrimaryLink.value = d.ctaPrimaryLink || '';
    if (form.ctaSecondaryText) form.ctaSecondaryText.value = d.ctaSecondaryText || '';
    if (form.ctaSecondaryLink) form.ctaSecondaryLink.value = d.ctaSecondaryLink || '';
  }
  const preview = form.querySelector('[data-page-hero-preview]');
  if (preview) {
    if (d.backgroundImageUrl) {
      preview.src = d.backgroundImageUrl;
      preview.hidden = false;
    } else {
      preview.hidden = true;
      preview.removeAttribute('src');
    }
  }
}

function showEditor(pageId) {
  activePageId = pageId;
  const doc = getPageHeroesCms();
  const form = document.getElementById('form-page-hero');
  if (!form) return;
  fillForm(form, doc.pages[pageId], pageId);
  document.querySelectorAll('[data-page-hero-tab]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.pageHeroTab === pageId);
  });
  const label = document.getElementById('page-hero-editor-title');
  if (label) label.textContent = `${PAGE_HERO_META[pageId]?.label || pageId} page hero`;
  const link = document.getElementById('page-hero-live-link');
  if (link) {
    link.href = PAGE_HERO_META[pageId]?.livePath || '/';
    link.textContent = `View ${PAGE_HERO_META[pageId]?.label || 'page'}`;
  }
}

async function savePageHero(e) {
  e.preventDefault();
  const form = document.getElementById('form-page-hero');
  if (!form) return;
  const cms = getAdminCms();
  const doc = getPageHeroesCms();
  doc.pages[activePageId] = pageFromForm(form, activePageId);
  doc.updatedAt = Date.now();
  cms.pageHeroes = doc;
  cms.hero = heroFirestorePayloadFromPageHeroes(doc);
  try {
    await saveSectionToFirestore(
      'hero',
      sanitizeFirestoreData(heroFirestorePayloadFromPageHeroes(doc))
    );
    adminToast(`${PAGE_HERO_META[activePageId]?.label} hero saved — live on site`, 'success');
  } catch (err) {
    adminToast(err?.message || 'Could not save page hero', 'error');
  }
}

async function handleUpload(file) {
  if (!file?.type?.startsWith('image/') || uploadInProgress) return;
  const form = document.getElementById('form-page-hero');
  if (!form) return;
  uploadInProgress = true;
  try {
    adminToast('Uploading background…', 'info');
    const result = await cloudinaryUpload(file, `heroes/${activePageId}`, (pct) => {
      const bar = form.querySelector('[data-page-hero-upload-bar]');
      if (bar) bar.style.width = `${pct}%`;
    });
    form.backgroundImageUrl.value = result.secure_url;
    const preview = form.querySelector('[data-page-hero-preview]');
    if (preview) {
      preview.src = result.secure_url;
      preview.hidden = false;
    }
    adminToast('Background uploaded — click Save to publish', 'info');
  } catch (err) {
    adminToast(err?.message || 'Upload failed', 'error');
  } finally {
    uploadInProgress = false;
    const bar = form.querySelector('[data-page-hero-upload-bar]');
    if (bar) bar.style.width = '0%';
  }
}

export function loadPageHeroesPanel() {
  showEditor(activePageId);
}

export function initPageHeroesPanel() {
  const panel = document.getElementById('panel-page-heroes');
  if (!panel || panel.dataset.bound === '1') return;
  panel.dataset.bound = '1';

  document.querySelectorAll('[data-page-hero-tab]').forEach((btn) => {
    btn.addEventListener('click', () => showEditor(btn.dataset.pageHeroTab));
  });

  document.getElementById('form-page-hero')?.addEventListener('submit', savePageHero);

  const fileInput = document.getElementById('page-hero-upload');
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) void handleUpload(file);
  });

  document.getElementById('page-hero-upload-btn')?.addEventListener('click', () => {
    fileInput?.click();
  });

  loadPageHeroesPanel();
}
