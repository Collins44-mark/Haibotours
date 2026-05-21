const DESTINATIONS = [
  {
    id: 'serengeti',
    name: 'Serengeti',
    subtitle: 'National Park',
    region: 'Northern Tanzania',
    image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=1974&auto=format&fit=crop',
    heroImage: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2070&auto=format&fit=crop',
    description:
      'Witness the Great Migration, endless golden plains, and Africa\'s most iconic wildlife on expertly guided game drives through Serengeti National Park.',
    bestTime: 'June – October (dry season) · January – February (calving season)',
    highlights: ['Great Migration', 'Big Five sightings', 'Sunrise game drives', 'Luxury tented camps'],
    gallery: [
      'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516939884455-1445c8652f83?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1974&auto=format&fit=crop',
    ],
    packages: [
      {
        name: 'Serengeti Essentials',
        duration: '3 Days / 2 Nights',
        price: '$1,250',
        priceNote: 'per person · shared vehicle',
        features: ['Park fees included', 'Professional guide', '4×4 safari vehicle', 'Lodge accommodation'],
        popular: false,
      },
      {
        name: 'Migration Explorer',
        duration: '5 Days / 4 Nights',
        price: '$2,180',
        priceNote: 'per person · luxury camp',
        features: ['All meals included', 'Private guide', 'Luxury tented camp', 'Hot air balloon add-on'],
        popular: true,
      },
      {
        name: 'Serengeti Grand Safari',
        duration: '7 Days / 6 Nights',
        price: '$3,450',
        priceNote: 'per person · premium',
        features: ['Full-board luxury', 'Exclusive camps', 'Night drive option', 'Photography specialist guide'],
        popular: false,
      },
    ],
    experience: {
      label: 'Wildlife & Nature',
      title: 'The Serengeti Experience',
      intro: 'Endless plains, dramatic predator action, and one of the greatest wildlife spectacles on Earth.',
      items: [
        { title: 'Great Migration', text: 'Watch millions of wildebeest and zebra cross the plains in a seasonal cycle unique to this ecosystem.' },
        { title: 'Big Five Safaris', text: 'Lions, leopards, elephants, buffalo, and rhino thrive across Seronera, Ndutu, and northern corridors.' },
        { title: 'Hot Air Balloon', text: 'Optional dawn flights over the savanna — a breathtaking perspective on the landscape below.' },
      ],
    },
  },
  {
    id: 'ngorongoro',
    name: 'Ngorongoro',
    subtitle: 'Crater',
    region: 'Northern Tanzania',
    image: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=1974&auto=format&fit=crop',
    heroImage: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=1974&auto=format&fit=crop',
    description:
      'Descend into the world\'s largest intact volcanic caldera — a natural amphitheater teeming with lions, rhinos, elephants, and flamingos.',
    bestTime: 'Year-round · Best wildlife June – October',
    highlights: ['Ngorongoro Crater floor', 'Black rhino sightings', 'Maasai culture visits', 'Scenic crater rim lodges'],
    gallery: [
      'https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1974&auto=format&fit=crop',
    ],
    packages: [
      {
        name: 'Crater Day Trip',
        duration: '1 Day',
        price: '$380',
        priceNote: 'per person',
        features: ['Crater descent permit', 'Picnic lunch', 'Full-day game drive', 'Hotel pickup from Arusha'],
        popular: true,
      },
      {
        name: 'Crater & Highlands',
        duration: '4 Days / 3 Nights',
        price: '$1,890',
        priceNote: 'per person',
        features: ['Rim lodge stay', 'Crater full day', 'Empakaai hike option', 'Maasai village visit'],
        popular: false,
      },
    ],
    experience: {
      label: 'Crater Wonders',
      title: 'Inside Ngorongoro',
      intro: 'A UNESCO World Heritage Site where wildlife concentrates in a stunning volcanic bowl.',
      items: [
        { title: 'Crater Floor Drive', text: 'Descend 600m into the caldera for full-day game viewing among dense wildlife populations.' },
        { title: 'Black Rhino Sanctuary', text: 'One of the best places in East Africa to spot the critically endangered black rhino.' },
        { title: 'Maasai Highlands', text: 'Combine your visit with cultural experiences and scenic hikes on the crater rim.' },
      ],
    },
  },
  {
    id: 'zanzibar',
    name: 'Zanzibar',
    subtitle: 'Island Paradise',
    region: 'Coastal Tanzania',
    image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?q=80&w=1974&auto=format&fit=crop',
    heroImage: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?q=80&w=1974&auto=format&fit=crop',
    description:
      'Turquoise waters, spice tours, Stone Town heritage, and pristine beaches — the perfect safari extension or standalone island escape.',
    bestTime: 'June – October · December – February',
    highlights: ['Stone Town tours', 'Spice farm visits', 'Snorkeling & dhow cruises', 'Beach resorts'],
    gallery: [
      'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1974&auto=format&fit=crop',
    ],
    packages: [
      {
        name: 'Beach Escape',
        duration: '4 Days / 3 Nights',
        price: '$890',
        priceNote: 'per person · mid-range resort',
        features: ['Airport transfers', 'Beach resort stay', 'Stone Town half-day tour', 'Breakfast daily'],
        popular: true,
      },
      {
        name: 'Spice & Sea',
        duration: '6 Days / 5 Nights',
        price: '$1,450',
        priceNote: 'per person',
        features: ['Spice tour', 'Prison Island visit', 'Sunset dhow cruise', 'Snorkeling trip'],
        popular: false,
      },
    ],
    experience: {
      label: 'Island Life',
      title: 'The Zanzibar Experience',
      intro: 'Swahili culture, spice-scented air, and Indian Ocean beaches perfect after a mainland safari.',
      items: [
        { title: 'Stone Town Heritage', text: 'Explore narrow alleys, historic doors, and markets in this UNESCO-listed old town.' },
        { title: 'Spice Plantation Tours', text: 'Discover cloves, vanilla, and tropical fruits on guided farm visits with local hosts.' },
        { title: 'Beach & Reef Adventures', text: 'Snorkel coral reefs, sail on traditional dhows, and unwind on white-sand shores.' },
      ],
    },
  },
  {
    id: 'kilimanjaro',
    name: 'Kilimanjaro',
    subtitle: 'Mountain Trek',
    region: 'Northern Tanzania',
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1974&auto=format&fit=crop',
    heroImage: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1974&auto=format&fit=crop',
    description:
      'Conquer Africa\'s highest peak — Uhuru Summit at 5,895m — with certified mountain guides and carefully paced routes.',
    bestTime: 'January – March · June – October',
    highlights: ['Machame & Marangu routes', 'Certified mountain crew', 'Summit certificate', 'Pre-trek briefing'],
    gallery: [
      'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1483728642387-6bc3bdd88c98?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1974&auto=format&fit=crop',
    ],
    packages: [
      {
        name: 'Machame Route',
        duration: '7 Days / 6 Nights',
        price: '$2,100',
        priceNote: 'per person · group trek',
        features: ['Park fees & camping', 'Porter & cook team', 'Summit attempt day 6', 'Gear rental available'],
        popular: true,
      },
      {
        name: 'Marangu Route',
        duration: '6 Days / 5 Nights',
        price: '$1,850',
        priceNote: 'per person · hut accommodation',
        features: ['Hut lodging', 'Gradual ascent', 'Rescue fees included', 'Pre-climb health check'],
        popular: false,
      },
    ],
    experience: {
      label: 'Summit Adventure',
      title: 'Climbing Kilimanjaro',
      intro: 'Africa\'s highest peak offers multiple routes through rainforest, alpine desert, and glacial zones.',
      items: [
        { title: 'Machame & Marangu Routes', text: 'Choose scenic camping on Machame or hut-based comfort on the classic Marangu path.' },
        { title: 'Altitude & Acclimatization', text: 'Gradual ascent profiles maximize summit success while prioritizing health and safety.' },
        { title: 'Uhuru Peak Sunrise', text: 'Reach 5,895m at dawn for unforgettable views above the clouds — a true lifetime achievement.' },
      ],
    },
  },
  {
    id: 'tarangire',
    name: 'Tarangire',
    subtitle: 'National Park',
    region: 'Northern Tanzania',
    image: 'https://images.unsplash.com/photo-1564760055775-d506ef2a0de4?q=80&w=1974&auto=format&fit=crop',
    heroImage: 'https://images.unsplash.com/photo-1564760055775-d506ef2a0de4?q=80&w=1974&auto=format&fit=crop',
    description:
      'Famous for giant elephant herds, baobab-dotted landscapes, and excellent birdwatching along the Tarangire River.',
    bestTime: 'June – October (peak wildlife)',
    highlights: ['Elephant herds', 'Baobab landscapes', 'Birding paradise', 'Walking safaris'],
    gallery: [
      'https://images.unsplash.com/photo-1564760055775-d506ef2a0de4?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=1974&auto=format&fit=crop',
    ],
    packages: [
      {
        name: 'Tarangire Day Safari',
        duration: '1 Day',
        price: '$320',
        priceNote: 'per person',
        features: ['Full-day game drive', 'Lunch included', 'Park fees', 'Pick-up from Arusha'],
        popular: true,
      },
      {
        name: 'Tarangire Overnight',
        duration: '2 Days / 1 Night',
        price: '$680',
        priceNote: 'per person',
        features: ['Lodge stay', 'Morning & afternoon drives', 'All meals', 'Professional guide'],
        popular: false,
      },
    ],
    experience: {
      label: 'Elephant Country',
      title: 'Tarangire Highlights',
      intro: 'Dry-season wildlife gathers along the river beneath iconic baobab trees.',
      items: [
        { title: 'Elephant Herds', text: 'Home to some of Tanzania\'s largest elephant concentrations, especially June–October.' },
        { title: 'Baobab Landscapes', text: 'Photogenic savanna dotted with ancient baobabs — a signature Tarangire vista.' },
        { title: 'Birding & Walking', text: 'Over 500 bird species plus optional guided bush walks for a closer connection to nature.' },
      ],
    },
  },
  {
    id: 'lake-manyara',
    name: 'Lake Manyara',
    subtitle: 'National Park',
    region: 'Northern Tanzania',
    image: 'https://images.unsplash.com/photo-1551632811-561732d0250a?q=80&w=1974&auto=format&fit=crop',
    heroImage: 'https://images.unsplash.com/photo-1551632811-561732d0250a?q=80&w=1974&auto=format&fit=crop',
    description:
      'Compact park with tree-climbing lions, flamingo-filled alkaline lake, and lush groundwater forest — ideal for a day trip.',
    bestTime: 'Year-round · Flamingos July – October',
    highlights: ['Tree-climbing lions', 'Flamingo lake views', 'Canopy walkway', 'Compact scenic drives'],
    gallery: [
      'https://images.unsplash.com/photo-1551632811-561732d0250a?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516939884455-1445c8652f83?q=80&w=1974&auto=format&fit=crop',
    ],
    packages: [
      {
        name: 'Manyara Day Trip',
        duration: '1 Day',
        price: '$290',
        priceNote: 'per person',
        features: ['Park entry', 'Game drive', 'Canopy walk option', 'Lunch box'],
        popular: true,
      },
    ],
    experience: {
      label: 'Compact Safari Gem',
      title: 'Lake Manyara Wonders',
      intro: 'A small park packed with diverse habitats from groundwater forest to alkaline lake shores.',
      items: [
        { title: 'Tree-Climbing Lions', text: 'Famous for lions resting in acacia branches — a rare and photogenic behavior.' },
        { title: 'Flamingo-Filled Lake', text: 'Thousands of pink flamingos gather on the lake when water levels suit breeding colonies.' },
        { title: 'Forest Canopy Walk', text: 'Elevated walkway through lush forest — ideal for birdlife and primate spotting.' },
      ],
    },
  },
  {
    id: 'ruaha',
    name: 'Ruaha',
    subtitle: 'National Park',
    region: 'Southern Tanzania',
    image: 'https://images.unsplash.com/photo-1549366021-9f761d450615?q=80&w=1974&auto=format&fit=crop',
    heroImage: 'https://images.unsplash.com/photo-1549366021-9f761d450615?q=80&w=1974&auto=format&fit=crop',
    description:
      'Tanzania\'s largest national park — remote, wild, and perfect for seasoned safari travelers seeking fewer crowds and big cat action.',
    bestTime: 'June – November',
    highlights: ['Remote wilderness', 'Large lion prides', 'Walking safaris', 'Fly-in luxury camps'],
    gallery: [
      'https://images.unsplash.com/photo-1549366021-9f761d450615?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=1974&auto=format&fit=crop',
    ],
    packages: [
      {
        name: 'Ruaha Wilderness',
        duration: '5 Days / 4 Nights',
        price: '$2,650',
        priceNote: 'per person · fly-in safari',
        features: ['Domestic flights', 'Bush camp stay', 'Private vehicle', 'Walking safari included'],
        popular: true,
      },
    ],
    experience: {
      label: 'Wild South',
      title: 'Ruaha Wilderness',
      intro: 'Tanzania\'s largest park — remote, raw, and rich in predators without the crowds.',
      items: [
        { title: 'Lion & Leopard Territory', text: 'Strong predator populations with excellent chances of sightings on game drives.' },
        { title: 'Great Ruaha River', text: 'Dry season draws elephants, hippos, and crocodiles to the life-giving river channels.' },
        { title: 'Walking Safaris', text: 'Bush walks with armed rangers offer an intimate, ground-level safari experience.' },
      ],
    },
  },
  {
    id: 'arusha',
    name: 'Arusha',
    subtitle: 'Safari Gateway',
    region: 'Northern Tanzania',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1974&auto=format&fit=crop',
    heroImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1974&auto=format&fit=crop',
    description:
      'The safari capital of Tanzania — gateway to northern parks, cultural experiences, coffee tours, and Mount Meru adventures.',
    bestTime: 'Year-round',
    highlights: ['Coffee plantation tours', 'Mount Meru treks', 'Cultural heritage sites', 'Safari logistics hub'],
    gallery: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1974&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1483728642387-6bc3bdd88c98?q=80&w=1974&auto=format&fit=crop',
    ],
    packages: [
      {
        name: 'Arusha City & Culture',
        duration: '2 Days / 1 Night',
        price: '$420',
        priceNote: 'per person',
        features: ['City tour', 'Coffee farm visit', 'Local lunch', 'Hotel transfer'],
        popular: false,
      },
      {
        name: 'Mount Meru Trek',
        duration: '4 Days / 3 Nights',
        price: '$1,120',
        priceNote: 'per person',
        features: ['Park fees', 'Mountain crew', 'Hut camping', 'Pre-trek briefing in Arusha'],
        popular: true,
      },
    ],
    experience: {
      label: 'Safari Gateway',
      title: 'Discover Arusha',
      intro: 'Your launch point for northern circuit safaris, culture, coffee, and Mount Meru adventures.',
      items: [
        { title: 'Coffee Plantation Tours', text: 'Visit working farms on the slopes of Mount Meru and taste freshly roasted Arabica.' },
        { title: 'Mount Meru Trek', text: 'A spectacular 4,566m volcano trek — perfect acclimatization before Kilimanjaro.' },
        { title: 'Cultural Heritage', text: 'Markets, museums, and Maasai communities offer authentic encounters before your safari begins.' },
      ],
    },
  },
];

/** Immutable local defaults — used when Firestore is empty or unavailable */
window.HAIBO_DESTINATIONS_STATIC = DESTINATIONS.map((d) => ({ ...d }));
window.DESTINATIONS = DESTINATIONS;

function getHaiboDestinations() {
  const staticList = window.HAIBO_DESTINATIONS_STATIC || DESTINATIONS;
  const fromContent = window.HAIBO_CONTENT?.destinations;
  if (typeof haiboMergeDestinationsList === 'function' && Array.isArray(fromContent)) {
    return haiboMergeDestinationsList(fromContent);
  }
  const fromWindow = Array.isArray(window.DESTINATIONS) ? window.DESTINATIONS : [];
  const pick = (arr) =>
    arr
      .filter((d) => d && d.id && d.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const live = pick(fromWindow);
  return live.length ? live : staticList;
}

function syncHaiboDestinations() {
  window.DESTINATIONS = getHaiboDestinations();
}

window.getHaiboDestinations = getHaiboDestinations;
window.syncHaiboDestinations = syncHaiboDestinations;

function getDestinationById(id) {
  if (!id) return null;
  const key =
    typeof haiboNormalizeDestId === 'function'
      ? haiboNormalizeDestId(id)
      : String(id).trim().toLowerCase();
  const match = (list) =>
    list.find((d) =>
      typeof haiboNormalizeDestId === 'function'
        ? haiboNormalizeDestId(d.id) === key
        : d.id === key
    ) || null;

  try {
    const live = getHaiboDestinations();
    const found = match(live);
    if (found) return found;
  } catch {
    /* fall through to static */
  }
  return match(window.HAIBO_DESTINATIONS_STATIC || DESTINATIONS);
}

/** Match user input or slug to a destination id */
function resolveDestinationSlug(input) {
  if (!input) return null;
  const raw = String(input).trim().toLowerCase();
  const slug = raw
    .replace(/national\s+park/gi, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const list = getHaiboDestinations();
  const exact = list.find((d) => d.id === slug || d.id === raw);
  if (exact) return exact.id;

  const byName = list.find((d) => {
    const name = d.name.toLowerCase();
    const nameSlug = name.replace(/\s+/g, '-');
    return (
      name === raw ||
      nameSlug === slug ||
      slug.includes(d.id) ||
      d.id.includes(slug) ||
      raw.includes(name) ||
      name.includes(raw.replace(/-/g, ' '))
    );
  });
  return byName ? byName.id : null;
}

/** SEO-friendly URLs on production; query param on local dev */
function destinationDetailUrl(id) {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:');
  return isLocal
    ? `destination.html?id=${encodeURIComponent(id)}`
    : destinationPrettyUrl(id);
}

function destinationDetailUrlFallback(id) {
  return destinationDetailUrl(id);
}

/** Pretty URL — use on Vercel (rewrite in vercel.json) */
function destinationPrettyUrl(id) {
  return `destinations/${encodeURIComponent(id)}`;
}

function getDestinationIdFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('id');
  if (q) return q.trim().toLowerCase();

  const pathMatch = window.location.pathname.match(/\/destinations\/([^/]+)\/?$/i);
  if (pathMatch) return decodeURIComponent(pathMatch[1]).toLowerCase();

  return null;
}

function haiboEscapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function haiboResolveCardImage(dest) {
  const key =
    typeof haiboNormalizeDestId === 'function'
      ? haiboNormalizeDestId(dest?.id)
      : String(dest?.id || '').toLowerCase();
  const staticD = (window.HAIBO_DESTINATIONS_STATIC || DESTINATIONS).find((d) =>
    typeof haiboNormalizeDestId === 'function'
      ? haiboNormalizeDestId(d.id) === key
      : d.id === key
  );
  const img = dest?.image || dest?.imageUrl || '';
  if (typeof haiboIsAdminUploadedUrl === 'function' && haiboIsAdminUploadedUrl(img)) {
    return img;
  }
  if (typeof haiboValidMediaUrl === 'function' && haiboValidMediaUrl(img)) {
    return img;
  }
  return staticD?.image || '';
}

/** Safari card HTML — shared by app.js and paint routine */
function haiboBuildDestinationCard(dest) {
  const href = destinationDetailUrl(dest.id);
  const imageUrl = haiboResolveCardImage(dest);
  const staticD =
    typeof haiboStaticDestination === 'function'
      ? haiboStaticDestination(dest.id)
      : (window.HAIBO_DESTINATIONS_STATIC || DESTINATIONS).find((d) => d.id === dest.id);
  const fallbackUrl = staticD?.image || '';
  const safeUrl = imageUrl || fallbackUrl;
  const bg = safeUrl.replace(/'/g, '%27').replace(/"/g, '%22');
  const imgSrc =
    typeof window.haiboOptimizeImage === 'function'
      ? window.haiboOptimizeImage(safeUrl, { width: 800 })
      : safeUrl;
  const alt = `${dest.name} safari — ${dest.subtitle}`;
  const fbAttr = fallbackUrl
    ? ` data-fallback="${haiboEscapeHtml(fallbackUrl)}" onerror="(function(img){var u=img.dataset.fallback;if(!u)return;img.classList.add('haibo-img-broken');var m=img.closest('.dest-card-media');if(m)m.style.backgroundImage='url('+u+')';img.onerror=null;})(this)"`
    : '';
  const img = safeUrl
    ? `<img src="${haiboEscapeHtml(imgSrc)}" alt="${haiboEscapeHtml(alt)}" loading="lazy" decoding="async" class="haibo-media dest-card-img w-full object-cover" width="800" height="533"${fbAttr}>`
    : '';
  const price =
    Array.isArray(dest.packages) && dest.packages[0]?.price
      ? dest.packages[0].price
      : 'Contact us';

  return `
    <a href="${haiboEscapeHtml(href)}" class="destination-card dest-card-premium glass rounded-[30px] overflow-hidden">
      <div class="relative dest-card-media"${bg ? ` style="background-image:url('${bg}')"` : ''}>
        ${img}
        <div class="dest-card-overlay overlay-dark" aria-hidden="true"></div>
        <div class="dest-card-shine" aria-hidden="true"></div>
        <div class="dest-card-body absolute bottom-6 left-6 right-6">
          <p class="dest-card-region text-xs orange uppercase tracking-[3px] mb-1">${haiboEscapeHtml(dest.region)}</p>
          <h3 class="dest-card-title text-2xl font-semibold mb-1">${haiboEscapeHtml(dest.name)}</h3>
          <p class="dest-card-subtitle text-gray-300">${haiboEscapeHtml(dest.subtitle)}</p>
          <p class="dest-card-price text-sm mt-3">From <span>${haiboEscapeHtml(price)}</span></p>
        </div>
      </div>
    </a>`;
}

/** Paint destination cards from local data — runs even if Firebase/CMS fails */
function haiboPaintDestinationCards(containerId, limit) {
  const container = document.getElementById(containerId);
  if (!container) return false;

  const staticList = window.HAIBO_DESTINATIONS_STATIC || DESTINATIONS;
  let list = staticList;
  try {
    if (typeof getHaiboDestinations === 'function') {
      const merged = getHaiboDestinations();
      if (merged.length) list = merged;
    }
  } catch (err) {
    console.warn('HAIBO: using static destinations after error', err);
    list = staticList;
  }
  list = list.map((d) => {
    const key =
      typeof haiboNormalizeDestId === 'function'
        ? haiboNormalizeDestId(d.id)
        : d.id;
    const base = staticList.find((s) =>
      typeof haiboNormalizeDestId === 'function'
        ? haiboNormalizeDestId(s.id) === key
        : s.id === key
    );
    if (!base) return d;
    return {
      ...base,
      ...d,
      image: haiboResolveCardImage({ ...d, id: key }),
      heroImage:
        typeof haiboIsAdminUploadedUrl === 'function' && haiboIsAdminUploadedUrl(d.heroImage)
          ? d.heroImage
          : base.heroImage || base.image,
    };
  });

  if (!list.length) return false;
  if (limit) list = list.slice(0, limit);

  container.innerHTML = list.map((dest) => haiboBuildDestinationCard(dest)).join('');

  container.dataset.haiboRendered = '1';
  return true;
}

function haiboBootDestinationGrids() {
  haiboPaintDestinationCards('all-destinations');
  haiboPaintDestinationCards('home-destinations', 4);
}

window.haiboPaintDestinationCards = haiboPaintDestinationCards;
window.haiboBuildDestinationCard = haiboBuildDestinationCard;
window.haiboBootDestinationGrids = haiboBootDestinationGrids;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', haiboBootDestinationGrids);
} else {
  haiboBootDestinationGrids();
}
