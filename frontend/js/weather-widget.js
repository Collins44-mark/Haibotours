/**
 * HAIBO Weather Mini-Slider — single slide instance, no duplicate DOM
 */
const WEATHER_PARKS_STATIC = [
  {
    id: 'serengeti',
    name: 'Serengeti National Park',
    shortName: 'Serengeti',
    lat: -2.333,
    lon: 34.833,
    facts: ['Dry Season', 'Big 5 Nearby', 'Golden Sunset'],
  },
  {
    id: 'ngorongoro',
    name: 'Ngorongoro Crater',
    shortName: 'Ngorongoro',
    lat: -3.167,
    lon: 35.583,
    facts: ['Crater Views', 'Rhino Habitat', 'Misty Mornings'],
  },
  {
    id: 'tarangire',
    name: 'Tarangire National Park',
    shortName: 'Tarangire',
    lat: -3.833,
    lon: 36.0,
    facts: ['Elephant Herds', 'Baobab Trees', 'River Wildlife'],
  },
  {
    id: 'lake-manyara',
    name: 'Lake Manyara',
    shortName: 'Lake Manyara',
    lat: -3.533,
    lon: 35.833,
    facts: ['Tree Lions', 'Flamingo Lake', 'Forest Drive'],
  },
  {
    id: 'ruaha',
    name: 'Ruaha National Park',
    shortName: 'Ruaha',
    lat: -7.65,
    lon: 34.85,
    facts: ['Remote Wild', 'Lion Country', 'Dry Bush'],
  },
  {
    id: 'mikumi',
    name: 'Mikumi National Park',
    shortName: 'Mikumi',
    lat: -7.4,
    lon: 37.083,
    facts: ['Easy Access', 'Open Plains', 'Wildlife Rich'],
  },
  {
    id: 'zanzibar',
    name: 'Zanzibar',
    shortName: 'Zanzibar',
    lat: -6.163,
    lon: 39.189,
    facts: ['Turquoise Sea', 'Spice Tours', 'Island Breeze'],
  },
  {
    id: 'kilimanjaro',
    name: 'Mount Kilimanjaro',
    shortName: 'Kilimanjaro',
    lat: -3.067,
    lon: 37.35,
    facts: ['Summit Trek', 'Alpine Zone', 'Cloud Forest'],
  },
];

window.WEATHER_PARKS_STATIC = WEATHER_PARKS_STATIC;

const TRANSITION_MS = 550;
const AUTOPLAY_MS = 5000;
const REFRESH_MS = 30 * 60 * 1000;

function getWeatherParks() {
  if (typeof haiboMergeWeatherCardsList === 'function') {
    return haiboMergeWeatherCardsList(window.HAIBO_CONTENT?.weatherCards);
  }
  const cards = window.HAIBO_CONTENT?.weatherCards;
  if (Array.isArray(cards) && cards.length > 0) {
    const live = cards.filter((c) => c && c.active !== false && c.lat != null && c.lon != null);
    if (live.length) return live;
  }
  return WEATHER_PARKS_STATIC;
}

window.getWeatherParks = getWeatherParks;

const WMO_ICONS = {
  0: { icon: '☀️', label: 'Clear' },
  1: { icon: '🌤️', label: 'Mainly clear' },
  2: { icon: '⛅', label: 'Partly cloudy' },
  3: { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Fog' },
  48: { icon: '🌫️', label: 'Fog' },
  51: { icon: '🌦️', label: 'Drizzle' },
  53: { icon: '🌦️', label: 'Drizzle' },
  55: { icon: '🌦️', label: 'Drizzle' },
  61: { icon: '🌧️', label: 'Rain' },
  63: { icon: '🌧️', label: 'Rain' },
  65: { icon: '🌧️', label: 'Heavy rain' },
  71: { icon: '🌨️', label: 'Snow' },
  73: { icon: '🌨️', label: 'Snow' },
  75: { icon: '🌨️', label: 'Snow' },
  80: { icon: '🌦️', label: 'Showers' },
  81: { icon: '🌧️', label: 'Showers' },
  82: { icon: '⛈️', label: 'Heavy showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  96: { icon: '⛈️', label: 'Thunderstorm' },
  99: { icon: '⛈️', label: 'Thunderstorm' },
};

function wmoToIcon(code) {
  if (WMO_ICONS[code]) return WMO_ICONS[code];
  if (code <= 3) return WMO_ICONS[code] || WMO_ICONS[2];
  if (code >= 61 && code <= 67) return WMO_ICONS[61];
  return { icon: '🌤️', label: 'Variable' };
}

async function fetchParkWeather(park) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', park.lat);
  url.searchParams.set('longitude', park.lon);
  url.searchParams.set('current', 'temperature_2m,weather_code');
  url.searchParams.set('timezone', 'Africa/Nairobi');

  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = await res.json();
  const temp = Math.round(data.current.temperature_2m);
  const code = data.current.weather_code;
  const { icon, label } = wmoToIcon(code);
  return { temp, icon, label, code };
}

function fallbackWeather(park, index) {
  const temps = [29, 22, 28, 26, 31, 30, 32, 18];
  return {
    temp: temps[index % temps.length],
    icon: '🌤️',
    label: 'Estimate',
    code: 2,
  };
}

/** Module-level singleton — prevents duplicate widgets / intervals */
let weatherWidgetInstance = null;
let weatherRefreshIntervalId = null;

class HaiboWeatherWidget {
  constructor(root) {
    this.root = root;
    this.activeIndex = 0;
    this.weatherData = [];
    this.autoplayTimer = null;
    this.isTransitioning = false;
    this.slideDuration = AUTOPLAY_MS;
    this.viewport = root.querySelector('.weather-widget-viewport');
    this.dotsContainer = root.querySelector('.weather-dots');
    this.overlay = root.querySelector('.weather-transition-overlay');
    this._onVisibility = () => {
      if (document.hidden) this.stopAutoplay();
      else this.startAutoplay();
    };
  }

  destroy() {
    this.stopAutoplay();
    document.removeEventListener('visibilitychange', this._onVisibility);
    if (this.viewport) this.viewport.innerHTML = '';
    if (this.dotsContainer) this.dotsContainer.innerHTML = '';
    this.isTransitioning = false;
  }

  get parks() {
    return getWeatherParks();
  }

  async init() {
    this.stopAutoplay();
    this.clearSlides();
    document.removeEventListener('visibilitychange', this._onVisibility);
    document.addEventListener('visibilitychange', this._onVisibility);

    this.root.classList.add('is-loading');
    this.activeIndex = 0;
    this.renderDots();
    this.mountSlide(0, false);

    await this.loadAllWeather();
    this.root.classList.remove('is-loading');
    this.mountSlide(this.activeIndex, false);
    this.startAutoplay();
  }

  async loadAllWeather() {
    const parks = this.parks;
    this.weatherData = await Promise.all(
      parks.map(async (park, i) => {
        try {
          const w = await fetchParkWeather(park);
          return { ...park, weather: w };
        } catch {
          return { ...park, weather: fallbackWeather(park, i) };
        }
      })
    );
  }

  /** Remove every slide node — guarantees no stacking */
  clearSlides() {
    if (!this.viewport) return;
    this.viewport.querySelectorAll('.weather-slide').forEach((el) => el.remove());
  }

  getSlideHtml(index) {
    const parks = this.parks;
    const park = parks[index];
    if (!park) return '';
    const labelPark = (park.shortName || park.name).toUpperCase();
    const loading = this.root.classList.contains('is-loading');
    const weather = this.weatherData[index]?.weather;

    if (loading || !weather) {
      return `
        <div class="weather-slide-header">
          <div>
            <div class="weather-slide-label">Today in</div>
            <div class="weather-slide-park">${labelPark}</div>
          </div>
          <div class="weather-temp-block">
            <div class="weather-temp">--°</div>
            <div class="weather-icon">···</div>
          </div>
        </div>
        <div class="weather-facts">
          ${(park.facts || []).map((f) => `<span class="weather-fact">${f}</span>`).join('')}
        </div>`;
    }

    const tempDisplay = park.displayTemp || `${weather.temp}°C`;
    const iconDisplay = park.displayLabel || weather.label;

    return `
      <div class="weather-slide-header">
        <div>
          <div class="weather-slide-label">Today in</div>
          <div class="weather-slide-park">${labelPark}</div>
        </div>
        <div class="weather-temp-block">
          <div class="weather-temp">${tempDisplay}</div>
          <div class="weather-icon" title="${iconDisplay}">${weather.icon}</div>
        </div>
      </div>
      <div class="weather-facts">
        ${(park.facts || []).map((f) => `<span class="weather-fact">${f}</span>`).join('')}
      </div>`;
  }

  /** Single slide in viewport — instant replace */
  mountSlide(index, animate) {
    const parks = this.parks;
    if (!parks.length) return;

    const safeIndex = ((index % parks.length) + parks.length) % parks.length;
    this.activeIndex = safeIndex;

    this.clearSlides();

    const slide = document.createElement('div');
    slide.className = 'weather-slide is-active';
    slide.setAttribute('role', 'tabpanel');
    slide.setAttribute('aria-hidden', 'false');
    slide.innerHTML = this.getSlideHtml(safeIndex);

    if (animate) {
      slide.classList.add('is-fade-in');
      requestAnimationFrame(() => {
        slide.classList.remove('is-fade-in');
      });
    }

    this.viewport.appendChild(slide);
    this.updateDots();
  }

  sweepOverlay() {
    if (!this.overlay) return;
    this.overlay.classList.remove('is-sweeping');
    void this.overlay.offsetWidth;
    this.overlay.classList.add('is-sweeping');
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async goTo(nextIndex) {
    const parks = this.parks;
    if (!parks.length || this.isTransitioning) return;

    const safeIndex = ((nextIndex % parks.length) + parks.length) % parks.length;
    if (safeIndex === this.activeIndex) return;

    this.isTransitioning = true;
    this.sweepOverlay();

    const current = this.viewport.querySelector('.weather-slide.is-active');
    if (current) {
      current.classList.add('is-fade-out');
      await this.wait(TRANSITION_MS);
    }

    this.mountSlide(safeIndex, true);
    this.isTransitioning = false;
  }

  next() {
    const parks = this.parks;
    if (!parks.length) return Promise.resolve();
    return this.goTo(this.activeIndex + 1);
  }

  renderDots() {
    const parks = this.parks;
    if (!this.dotsContainer) return;

    this.dotsContainer.innerHTML = parks
      .map(
        (_, i) =>
          `<button type="button" class="weather-dot${i === this.activeIndex ? ' is-active' : ''}" data-index="${i}" aria-label="${parks[i].shortName || parks[i].name}" aria-selected="${i === this.activeIndex}"></button>`
      )
      .join('');

    this.dotsContainer.querySelectorAll('.weather-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.dataset.index, 10);
        if (Number.isNaN(idx) || idx === this.activeIndex || this.isTransitioning) return;
        this.stopAutoplay();
        this.goTo(idx).then(() => this.startAutoplay());
      });
    });
  }

  updateDots() {
    if (!this.dotsContainer) return;
    this.dotsContainer.querySelectorAll('.weather-dot').forEach((dot, i) => {
      const active = i === this.activeIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  startAutoplay() {
    this.stopAutoplay();
    const parks = this.parks;
    if (parks.length < 2) return;

    this.autoplayTimer = setInterval(() => {
      if (!this.isTransitioning) this.next();
    }, this.slideDuration);
  }

  stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  async refreshWeather() {
    if (this.isTransitioning) return;
    await this.loadAllWeather();
    this.mountSlide(this.activeIndex, false);
  }

  /** Rebuild dots/data when CMS content changes — do not create a second widget */
  async updateFromContent() {
    const parks = this.parks;
    if (!parks.length) return;

    this.stopAutoplay();
    if (this.activeIndex >= parks.length) this.activeIndex = 0;

    await this.loadAllWeather();
    this.renderDots();
    this.mountSlide(this.activeIndex, false);
    this.startAutoplay();
  }
}

function stopWeatherRefreshInterval() {
  if (weatherRefreshIntervalId) {
    clearInterval(weatherRefreshIntervalId);
    weatherRefreshIntervalId = null;
  }
}

function startWeatherRefreshInterval() {
  stopWeatherRefreshInterval();
  weatherRefreshIntervalId = setInterval(() => {
    weatherWidgetInstance?.refreshWeather();
  }, REFRESH_MS);
}

function initWeatherWidget() {
  const root = document.getElementById('weather-widget');
  if (!root) return;

  if (weatherWidgetInstance) {
    weatherWidgetInstance.updateFromContent();
    return;
  }

  weatherWidgetInstance = new HaiboWeatherWidget(root);
  root._haiboWidget = weatherWidgetInstance;
  weatherWidgetInstance.init();
  startWeatherRefreshInterval();
}

function destroyWeatherWidget() {
  stopWeatherRefreshInterval();
  if (weatherWidgetInstance) {
    weatherWidgetInstance.destroy();
    weatherWidgetInstance = null;
  }
  const root = document.getElementById('weather-widget');
  if (root) {
    root._haiboWidget = null;
    const vp = root.querySelector('.weather-widget-viewport');
    if (vp) vp.innerHTML = '';
  }
}

window.refreshHaiboWeatherWidget = initWeatherWidget;
window.destroyHaiboWeatherWidget = destroyWeatherWidget;

function bootWeatherWidget() {
  if (!document.getElementById('weather-widget')) return;

  if (!window.HAIBO_CONTENT) {
    window.HAIBO_CONTENT = {
      hero: null,
      about: null,
      contact: null,
      socials: null,
      settings: null,
      destinations: [],
      gallery: { images: [], videos: [] },
      weatherCards: WEATHER_PARKS_STATIC.map((p) => ({ ...p, active: true })),
      search: { enabledDestinationIds: [] },
    };
  }

  if (typeof mergeHaiboContentWithDefaults === 'function') {
    mergeHaiboContentWithDefaults();
  }

  initWeatherWidget();

  window.addEventListener('haiboContentReady', () => initWeatherWidget(), { once: true });
  window.addEventListener('haiboContentUpdated', () => {
    if (weatherWidgetInstance) {
      weatherWidgetInstance.updateFromContent();
    } else {
      initWeatherWidget();
    }
  });
}

document.addEventListener('DOMContentLoaded', bootWeatherWidget);
