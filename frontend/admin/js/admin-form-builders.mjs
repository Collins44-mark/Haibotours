/**
 * Visual form builders — packages, experience, highlights (no JSON).
 */

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/** @param {HTMLElement} root */
export function initHighlightsChips(root, initial = []) {
  if (!root) return;
  const input = root.querySelector('[data-chip-input]');
  const list = root.querySelector('[data-chip-list]');
  const chips = [...initial];

  if (!list) {
    root.getValues = () => [...chips];
    return;
  }

  function render() {
    list.innerHTML = chips
      .map(
        (t, i) => `
      <span class="haibo-chip" data-chip-index="${i}">
        ${escapeHtml(t)}
        <button type="button" aria-label="Remove">&times;</button>
      </span>`
      )
      .join('');
    list.querySelectorAll('.haibo-chip button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.closest('[data-chip-index]')?.dataset.chipIndex);
        chips.splice(idx, 1);
        render();
        root.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  function addChip(text) {
    const v = String(text || '').trim();
    if (!v || chips.includes(v)) return;
    chips.push(v);
    render();
    root.dispatchEvent(new Event('change', { bubbles: true }));
  }

  root.querySelector('[data-chip-add]')?.addEventListener('click', () => {
    addChip(input?.value);
    if (input) input.value = '';
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addChip(input.value);
      input.value = '';
    }
  });

  render();
  root.getValues = () => [...chips];
}

function packageCardHtml(pkg, index) {
  const features = (pkg.features || []).map((f) => escapeHtml(f)).join('');
  const featureFields = (pkg.features || [''])
    .map(
      (f, fi) => `
    <div class="haibo-feature-row" data-feature-row>
      <input type="text" class="haibo-input" data-pkg-feature value="${escapeHtml(f)}" placeholder="Feature" style="flex:1" />
      <button type="button" class="haibo-btn haibo-btn--ghost haibo-btn--sm" data-remove-feature aria-label="Remove feature">&times;</button>
    </div>`
    )
    .join('');

  return `
  <article class="haibo-builder-card" data-package-card data-index="${index}">
    <div class="haibo-builder-card__head">
      <strong>Package ${index + 1}</strong>
      <button type="button" class="haibo-btn haibo-btn--ghost haibo-btn--sm" data-remove-package>Remove</button>
    </div>
    <div class="haibo-grid-2">
      <div class="haibo-field"><label>Name</label><input class="haibo-input" data-pkg-name value="${escapeHtml(pkg.name)}" style="width:100%" /></div>
      <div class="haibo-field"><label>Duration</label><input class="haibo-input" data-pkg-duration value="${escapeHtml(pkg.duration)}" style="width:100%" /></div>
      <div class="haibo-field"><label>Price</label><input class="haibo-input" data-pkg-price value="${escapeHtml(pkg.price)}" style="width:100%" /></div>
      <div class="haibo-field"><label>Price note</label><input class="haibo-input" data-pkg-note value="${escapeHtml(pkg.priceNote)}" style="width:100%" /></div>
    </div>
    <label style="display:flex;align-items:center;gap:0.5rem;margin:0.75rem 0;font-size:0.85rem"><input type="checkbox" data-pkg-popular ${pkg.popular ? 'checked' : ''} /> Popular package</label>
    <p style="font-size:0.8rem;color:#9ca3af;margin:0 0 0.5rem">Features</p>
    <div data-features-list>${featureFields}</div>
    <button type="button" class="haibo-btn haibo-btn--ghost haibo-btn--sm" data-add-feature style="margin-top:0.5rem">+ Add feature</button>
  </article>`;
}

/** @param {HTMLElement} root */
export function initPackagesBuilder(root, initial = []) {
  if (!root) return;
  const list = root.querySelector('[data-packages-list]');
  if (!list) {
    root.getValues = () => [];
    return;
  }
  let packages = initial.length ? JSON.parse(JSON.stringify(initial)) : [];

  function bindCard(card) {
    card.querySelector('[data-remove-package]')?.addEventListener('click', () => {
      card.remove();
      root.dispatchEvent(new Event('change', { bubbles: true }));
    });
    card.querySelector('[data-add-feature]')?.addEventListener('click', () => {
      const fl = card.querySelector('[data-features-list]');
      const row = document.createElement('div');
      row.className = 'haibo-feature-row';
      row.dataset.featureRow = '';
      row.innerHTML = `
        <input type="text" class="haibo-input" data-pkg-feature placeholder="Feature" style="flex:1" />
        <button type="button" class="haibo-btn haibo-btn--ghost haibo-btn--sm" data-remove-feature>&times;</button>`;
      fl.appendChild(row);
      row.querySelector('[data-remove-feature]')?.addEventListener('click', () => row.remove());
    });
    card.querySelectorAll('[data-remove-feature]').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('[data-feature-row]')?.remove());
    });
  }

  function render() {
    list.innerHTML = packages.map((p, i) => packageCardHtml(p, i)).join('');
    list.querySelectorAll('[data-package-card]').forEach(bindCard);
  }

  root.querySelector('[data-add-package]')?.addEventListener('click', () => {
    packages.push({ name: '', duration: '', price: '', priceNote: '', features: [''], popular: false });
    render();
    root.dispatchEvent(new Event('change', { bubbles: true }));
  });

  render();

  root.getValues = () => {
    const out = [];
    list.querySelectorAll('[data-package-card]').forEach((card) => {
      const features = [...card.querySelectorAll('[data-pkg-feature]')]
        .map((i) => i.value.trim())
        .filter(Boolean);
      out.push({
        name: card.querySelector('[data-pkg-name]')?.value?.trim() || '',
        duration: card.querySelector('[data-pkg-duration]')?.value?.trim() || '',
        price: card.querySelector('[data-pkg-price]')?.value?.trim() || '',
        priceNote: card.querySelector('[data-pkg-note]')?.value?.trim() || '',
        popular: Boolean(card.querySelector('[data-pkg-popular]')?.checked),
        features,
      });
    });
    return out.filter((p) => p.name || p.price);
  };
}

function experienceItemHtml(item, index) {
  return `
  <article class="haibo-builder-card" data-exp-item data-index="${index}">
    <div class="haibo-builder-card__head">
      <strong>Experience ${index + 1}</strong>
      <button type="button" class="haibo-btn haibo-btn--ghost haibo-btn--sm" data-remove-exp>Remove</button>
    </div>
    <div class="haibo-field"><label>Title</label><input class="haibo-input" data-exp-title value="${escapeHtml(item.title)}" style="width:100%" /></div>
    <div class="haibo-field"><label>Description</label><textarea class="haibo-input" data-exp-text rows="3" style="width:100%">${escapeHtml(item.text)}</textarea></div>
  </article>`;
}

/** @param {HTMLElement} root */
export function initExperienceBuilder(root, experience = {}) {
  if (!root) return;
  const meta = root.querySelector('[data-exp-meta]');
  const list = root.querySelector('[data-exp-items]');
  const labelEl = meta?.querySelector('[data-exp-label]');
  const sectionTitleEl = meta?.querySelector('[data-exp-title]');
  const introEl = root.querySelector('[data-exp-intro]');
  if (labelEl) labelEl.value = experience.label || '';
  if (sectionTitleEl) sectionTitleEl.value = experience.title || '';
  if (introEl) introEl.value = experience.intro || '';

  let items = Array.isArray(experience.items) ? [...experience.items] : [];

  if (!list) {
    root.getValues = () => ({
      label: labelEl?.value?.trim() || '',
      title: sectionTitleEl?.value?.trim() || '',
      intro: introEl?.value?.trim() || '',
      items: [],
    });
    return;
  }

  function render() {
    list.innerHTML = items.map((it, i) => experienceItemHtml(it, i)).join('');
    list.querySelectorAll('[data-exp-item]').forEach((card) => {
      card.querySelector('[data-remove-exp]')?.addEventListener('click', () => {
        card.remove();
        root.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  root.querySelector('[data-add-exp-item]')?.addEventListener('click', () => {
    items.push({ title: '', text: '' });
    render();
    root.dispatchEvent(new Event('change', { bubbles: true }));
  });

  render();

  root.getValues = () => ({
    label: labelEl?.value?.trim() || '',
    title: sectionTitleEl?.value?.trim() || '',
    intro: introEl?.value?.trim() || '',
    items: [...list.querySelectorAll('[data-exp-item]')].map((card) => ({
      title: card.querySelector('[data-exp-title]')?.value?.trim() || '',
      text: card.querySelector('[data-exp-text]')?.value?.trim() || '',
    })).filter((i) => i.title || i.text),
  });
}
