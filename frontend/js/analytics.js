/**
 * Google Analytics 4 (gtag.js) — public pages only, production hosts only.
 * Each public page is a full page load, so the automatic page_view from `config` fires once per page.
 */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-6PF7TG0LSS';
  /* Apex is canonical; www is listed because Vercel currently serves the site on www. */
  var PRODUCTION_HOSTS = ['haiboafricatours.co.tz', 'www.haiboafricatours.co.tz'];
  /* Anything else in the query string is dropped — a form submitted before JS loads would put name/email/phone there. */
  var ALLOWED_PARAMS = /^(id|utm_[a-z_]+|gclid|gbraid|wbraid)$/;

  if (PRODUCTION_HOSTS.indexOf(window.location.hostname) === -1) return;
  if (window.__haiboGaLoaded) return;
  window.__haiboGaLoaded = true;

  function safePageLocation() {
    var url = new URL(window.location.href);
    var kept = new URLSearchParams();
    url.searchParams.forEach(function (value, key) {
      if (ALLOWED_PARAMS.test(key)) kept.append(key, value);
    });
    var query = kept.toString();
    return url.origin + url.pathname + (query ? '?' + query : '');
  }

  var tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(tag);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, { page_location: safePageLocation() });
})();
