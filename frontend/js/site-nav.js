/**
 * In-page navigation between the public pages.
 *
 * Every URL still serves its own complete HTML (title, meta, canonical, JSON-LD, H1), so
 * direct loads, refreshes and crawlers are unaffected. For same-origin clicks between public
 * pages this fetches that same HTML, swaps the head metadata and page content, keeps the
 * header in place and updates the address bar with history.pushState. Anything unexpected
 * falls back to a normal full page load.
 *
 * GA4: the property's enhanced measurement sends a page_view on browser history changes,
 * so pushState / Back / Forward are each counted once by GA itself; no manual page_view here.
 */
(function () {
  'use strict';

  if (window.__haiboSiteNav) return;
  if (!window.history || !history.pushState || !window.fetch || !window.DOMParser || !window.URL) return;
  if (!document.body || !document.querySelector('nav.nav-blur')) return;
  window.__haiboSiteNav = true;

  const PAGE_PATH =
    /^\/(?:index\.html)?$|^\/destinations(?:\.html)?\/?$|^\/destinations\/[a-z0-9][a-z0-9-]*\/?$|^\/(?:gallery|contact)\.html$/i;
  const PAGES = ['home', 'destinations', 'destination-detail', 'gallery', 'contact'];
  const HEAD_SELECTOR = [
    'title',
    'meta[name="description"]',
    'meta[name="robots"]',
    'meta[name="haibo-seo-page"]',
    'link[rel="canonical"]',
    'meta[property^="og:"]',
    'meta[name^="twitter:"]',
    'script[type="application/ld+json"]',
  ].join(', ');
  /* Scripts that are safe to add mid-session; value = their DOMContentLoaded boot function. */
  const LAZY_SCRIPTS = {
    '/js/gallery-data.js': '',
    '/js/gallery-page.js': 'bootGalleryPage',
    '/js/weather-widget.js': 'bootWeatherWidget',
  };
  const FADE_MS = 160;
  const PREFETCH_TTL_MS = 30000;
  /* Public pages live at the site root (or use <base href="/">), so their relative URLs resolve
     against "/". Resolve attributes against that instead of the live URL, which on Back/Forward
     already points at the next page before its content is swapped in. */
  const SITE_ROOT = location.origin + '/';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pageNodes = new WeakSet();
  const prefetched = new Map();
  const entries = new Map();
  let navSeq = 0;
  let currentKey = entryKey(history.state);
  let currentPath = pathKey(location);

  Array.prototype.forEach.call(document.body.children, (el) => {
    if (el.tagName !== 'SCRIPT') pageNodes.add(el);
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('pagehide', () => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  });
  window.addEventListener('pageshow', () => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  });

  function entryKey(state) {
    return (state && state.haiboNav) || 'url:' + location.pathname + location.search;
  }

  function normalizedPath(pathname) {
    if (/^\/index\.html$/i.test(pathname)) return '/';
    if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
    return pathname;
  }

  function pathKey(loc) {
    return normalizedPath(loc.pathname) + loc.search;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** URL for a link this layer may handle, or null to leave it to the browser. */
  function handledUrl(a) {
    if (!a || typeof a.href !== 'string') return null;
    if (a.hasAttribute('download') || a.hasAttribute('data-no-spa')) return null;
    const target = a.getAttribute('target');
    if (target && target.toLowerCase() !== '_self') return null;
    const raw = (a.getAttribute('href') || '').trim();
    if (!raw || raw.charAt(0) === '#') return null;
    if (/^(?:mailto|tel|sms|javascript|whatsapp|intent):/i.test(raw)) return null;
    let url;
    try {
      url = new URL(a.href);
    } catch {
      return null;
    }
    if (url.origin !== location.origin) return null;
    return url;
  }

  function fetchPage(href) {
    const hit = prefetched.get(href);
    if (hit && Date.now() - hit.time < PREFETCH_TTL_MS) return hit.promise;
    const promise = fetch(href, { credentials: 'same-origin', headers: { Accept: 'text/html' } }).then((res) => {
      const type = res.headers.get('content-type') || '';
      if (!res.ok || type.indexOf('text/html') === -1) throw new Error(`HTTP ${res.status}`);
      return res.text().then((html) => ({ html, url: res.url || href }));
    });
    prefetched.set(href, { time: Date.now(), promise });
    promise.catch(() => prefetched.delete(href));
    return promise;
  }

  function documentBase(doc, pageUrl) {
    const base = doc.querySelector('base[href]');
    return base ? new URL(base.getAttribute('href'), pageUrl).href : pageUrl;
  }

  /** Scripts the new page needs that this document has not run yet, or null if unsupported. */
  function missingScripts(doc, base) {
    const loaded = new Set();
    document.querySelectorAll('script[src]').forEach((s) => {
      const u = new URL(s.getAttribute('src'), SITE_ROOT);
      loaded.add(u.origin === location.origin ? u.pathname : u.href);
    });
    const missing = [];
    for (const s of doc.querySelectorAll('script[src]')) {
      const u = new URL(s.getAttribute('src'), base);
      const key = u.origin === location.origin ? u.pathname : u.href;
      if (loaded.has(key)) continue;
      if (!(key in LAZY_SCRIPTS)) return null;
      missing.push({ src: u.href, boot: LAZY_SCRIPTS[key] });
    }
    return missing;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`script ${src}`));
      document.body.appendChild(s);
    });
  }

  /** Adds stylesheets the new page needs (resolves once loaded); returns the set it wants. */
  function prepareStyles(doc, base) {
    const wanted = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]')).map(
      (l) => new URL(l.getAttribute('href'), base).href
    );
    const live = new Map();
    document.querySelectorAll('link[rel="stylesheet"][href]').forEach((l) => live.set(styleKey(l), l));
    const pending = [];
    let prev = null;
    wanted.forEach((href) => {
      let link = live.get(href);
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        pending.push(
          new Promise((resolve) => {
            link.onload = link.onerror = resolve;
            setTimeout(resolve, 3000);
          })
        );
        if (prev) prev.after(link);
        else document.head.appendChild(link);
        live.set(href, link);
      }
      prev = link;
    });
    return Promise.all(pending).then(() => new Set(wanted));
  }

  function styleKey(link) {
    return new URL(link.getAttribute('href'), SITE_ROOT).href;
  }

  function applyStyles(wanted) {
    document.querySelectorAll('link[rel="stylesheet"][href]').forEach((l) => {
      if (l.sheet) l.sheet.disabled = !wanted.has(styleKey(l));
    });
  }

  function setBase(href) {
    let base = document.head.querySelector('base');
    if (href == null) {
      if (base) base.remove();
      return;
    }
    if (!base) {
      base = document.createElement('base');
      document.head.insertBefore(base, document.head.firstChild);
    }
    base.setAttribute('href', href);
  }

  function swapHead(doc) {
    const head = document.head;
    const old = Array.from(head.querySelectorAll(HEAD_SELECTOR));
    const anchor = old[0] || null;
    Array.from(doc.head.querySelectorAll(HEAD_SELECTOR)).forEach((el) => {
      head.insertBefore(document.importNode(el, true), anchor);
    });
    old.forEach((el) => el.remove());
  }

  function swapBody(doc) {
    const body = document.body;
    const oldNodes = Array.from(body.children).filter((el) => pageNodes.has(el));
    const newNodes = Array.from(doc.body.children)
      .filter((el) => el.tagName !== 'SCRIPT')
      .map((el) => document.importNode(el, true));

    const oldLogo = body.querySelector('nav.nav-blur [data-haibo-logo]');
    newNodes.forEach((el) => {
      const logo = el.matches('nav.nav-blur') && el.querySelector('[data-haibo-logo]');
      if (logo && oldLogo) logo.replaceWith(oldLogo);
    });

    const anchor = oldNodes[0] || body.firstChild;
    newNodes.forEach((el) => {
      body.insertBefore(el, anchor);
      pageNodes.add(el);
    });
    oldNodes.forEach((el) => el.remove());

    const keep = ['haibo-content-loading', 'haibo-content-ready'].filter((c) => body.classList.contains(c));
    Array.from(body.attributes).forEach((attr) => body.removeAttribute(attr.name));
    Array.from(doc.body.attributes).forEach((attr) => body.setAttribute(attr.name, attr.value));
    keep.forEach((c) => body.classList.add(c));
  }

  function leaveCurrentPage() {
    if (typeof window.haiboSetMobileMenuOpen === 'function') window.haiboSetMobileMenuOpen(false);
    if (document.body.dataset.page === 'home' && typeof window.destroyHaiboWeatherWidget === 'function') {
      window.destroyHaiboWeatherWidget();
    }
    const wa = document.getElementById('whatsapp-float');
    if (wa) delete wa.dataset.waMessage;
  }

  function initNewPage(boots) {
    boots.forEach((name) => {
      if (name && typeof window[name] === 'function') window[name]();
    });
    if (typeof window.runHaiboPage === 'function') window.runHaiboPage();
    if (typeof window.haiboInitPageSEO === 'function') window.haiboInitPageSEO();
  }

  /* Jumps like a full page load would (the site CSS sets scroll-behavior: smooth). */
  function scrollToTarget(hash, savedY) {
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    let el = null;
    if (typeof savedY !== 'number' && hash && hash.length > 1) {
      try {
        el = document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        el = null;
      }
    }
    if (typeof savedY === 'number') window.scrollTo(0, savedY);
    else if (el) el.scrollIntoView();
    else window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  }

  function focusNewPage() {
    const target = document.querySelector('main h1, body > header h1') || document.getElementById('main-content');
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function fadeIn() {
    void document.body.offsetHeight;
    root.classList.remove('haibo-nav-leaving');
    root.removeAttribute('aria-busy');
    setTimeout(() => root.classList.remove('haibo-nav-active'), reduceMotion ? 0 : FADE_MS + 40);
  }

  async function navigate(url, mode) {
    const seq = ++navSeq;
    const hash = url.hash;
    const fetchUrl = new URL(url.href);
    fetchUrl.hash = '';

    entries.set(currentKey, { scrollY: window.scrollY, title: document.title });
    if (mode === 'pop') setBase('/');

    root.classList.add('haibo-nav-active', 'haibo-nav-leaving');
    root.setAttribute('aria-busy', 'true');
    const faded = wait(reduceMotion ? 0 : FADE_MS);

    let swapped = false;
    try {
      const page = await fetchPage(fetchUrl.href);
      if (seq !== navSeq) return;
      const doc = new DOMParser().parseFromString(page.html, 'text/html');
      const finalUrl = new URL(page.url);
      if (finalUrl.origin !== location.origin || !PAGE_PATH.test(finalUrl.pathname)) throw new Error('unsupported page');
      if (PAGES.indexOf(doc.body && doc.body.dataset.page) === -1 || !doc.querySelector('nav.nav-blur')) {
        throw new Error('unsupported page');
      }
      const base = documentBase(doc, finalUrl.href);
      const scripts = missingScripts(doc, base);
      if (!scripts) throw new Error('unsupported scripts');

      const [styles] = await Promise.all([
        prepareStyles(doc, base),
        scripts.reduce((p, s) => p.then(() => loadScript(s.src)), Promise.resolve()),
        faded,
      ]);
      if (seq !== navSeq) return;

      leaveCurrentPage();
      setBase('/');
      applyStyles(styles);
      swapHead(doc);
      swapBody(doc);
      swapped = true;

      const newPath = normalizedPath(finalUrl.pathname) + finalUrl.search;
      if (mode === 'push') {
        const key = `n${Date.now().toString(36)}${seq}`;
        history.pushState({ haiboNav: key }, '', newPath + hash);
        currentKey = key;
      } else {
        currentKey = entryKey(history.state);
      }
      currentPath = pathKey(location);
      const newBase = doc.querySelector('base[href]');
      setBase(newBase ? newBase.getAttribute('href') : null);

      initNewPage(scripts.map((s) => s.boot));

      const saved = mode === 'pop' ? entries.get(currentKey) : null;
      scrollToTarget(hash, saved ? saved.scrollY : undefined);
      entries.set(currentKey, { scrollY: window.scrollY, title: document.title });
      focusNewPage();
      fadeIn();
      window.dispatchEvent(new CustomEvent('haibo:navigated', { detail: { url: location.href } }));
    } catch (err) {
      if (seq !== navSeq) return;
      console.warn('[HAIBO] in-page navigation fell back to a full load:', err && err.message);
      if (swapped || mode === 'pop') window.location.reload();
      else window.location.assign(url.href);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    const url = handledUrl(a);
    if (!url) return;

    if (normalizedPath(url.pathname) + url.search === currentPath) {
      if (url.hash) {
        if (url.pathname === location.pathname && url.search === location.search) return;
        e.preventDefault();
        location.hash = url.hash;
        return;
      }
      e.preventDefault();
      if (typeof window.haiboSetMobileMenuOpen === 'function') window.haiboSetMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }

    if (!PAGE_PATH.test(url.pathname)) return;
    e.preventDefault();
    navigate(url, 'push');
  });

  window.addEventListener('popstate', (e) => {
    if (pathKey(location) === currentPath) return;
    const saved = entries.get(entryKey(e.state));
    if (saved && saved.title) document.title = saved.title;
    navigate(new URL(location.href), 'pop');
  });

  function prefetchFromEvent(e) {
    const conn = navigator.connection;
    if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;
    const a = e.target.closest && e.target.closest('a[href]');
    const url = handledUrl(a);
    if (!url || !PAGE_PATH.test(url.pathname)) return;
    if (normalizedPath(url.pathname) + url.search === currentPath) return;
    url.hash = '';
    fetchPage(url.href).catch(() => {});
  }

  document.addEventListener('mouseover', prefetchFromEvent, { passive: true });
  document.addEventListener('touchstart', prefetchFromEvent, { passive: true });
  document.addEventListener('focusin', prefetchFromEvent);
})();
