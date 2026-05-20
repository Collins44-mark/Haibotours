/**
 * HAIBO API client — set apiBaseUrl in config.js to your Render service URL
 */
async function haiboApi(path, options = {}) {
  const base = (HAIBO_CONFIG.apiBaseUrl || '').replace(/\/$/, '');
  if (!base) {
    throw new Error('API URL not configured. Set apiBaseUrl in js/config.js');
  }

  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || data.details?.[0]?.message || 'Request failed';
    throw new Error(msg);
  }

  return data;
}

async function submitInquiry(payload) {
  return haiboApi('/api/inquiries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function subscribeNewsletter(email) {
  return haiboApi('/api/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

async function submitSearch(payload) {
  return haiboApi('/api/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function showFormMessage(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.className = isError
    ? 'form-message text-sm mt-3 text-red-400'
    : 'form-message text-sm mt-3 text-green-400';
  el.classList.remove('hidden');
}
