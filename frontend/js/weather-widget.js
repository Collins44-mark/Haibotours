/**
 * HAIBO Weather Mini-Slider
 * Live data via Open-Meteo (free, no API key)
 */
const WEATHER_PARKS = [
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

class HaiboWeatherWidget {
  constructor(root) {
    this.root = root;
    this.index = 0;
    this.weatherData = [];
    this.timer = null;
    this.isAnimating = false;
    this.slideDuration = 5000;
    this.viewport = root.querySelector('.weather-widget-viewport');
    this.dotsContainer = root.querySelector('.weather-dots');
    this.overlay = root.querySelector('.weather-transition-overlay');
  }

  async init() {
    this.root.classList.add('is-loading');
    this.renderDots();
    this.renderSlide(0, true);

    await this.loadAllWeather();
    this.root.classList.remove('is-loading');
    this.renderSlide(0, true);
    this.startAutoplay();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopAutoplay();
      else this.startAutoplay();
    });
  }

  async loadAllWeather() {
    const results = await Promise.all(
      WEATHER_PARKS.map(async (park, i) => {
        try {
          const w = await fetchParkWeather(park);
          return { ...park, weather: w };
        } catch {
          return { ...park, weather: fallbackWeather(park, i) };
        }
      })
    );
    this.weatherData = results;
  }

  renderDots() {
    this.dotsContainer.innerHTML = WEATHER_PARKS.map(
      (_, i) =>
        `<button type="button" class="weather-dot${i === 0 ? ' is-active' : ''}" data-index="${i}" aria-label="Show park ${i + 1}"></button>`
    ).join('');

    this.dotsContainer.querySelectorAll('.weather-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.dataset.index, 10);
        if (idx !== this.index && !this.isAnimating) {
          this.goTo(idx);
        }
      });
    });
  }

  updateDots() {
    this.dotsContainer.querySelectorAll('.weather-dot').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === this.index);
    });
  }

  getSlideHtml(park, weather, isLoading) {
    const labelPark = (park.shortName || park.name).toUpperCase();

    if (isLoading || !weather) {
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
          ${park.facts.map((f) => `<span class="weather-fact">${f}</span>`).join('')}
        </div>
      `;
    }

    return `
      <div class="weather-slide-header">
        <div>
          <div class="weather-slide-label">Today in</div>
          <div class="weather-slide-park">${labelPark}</div>
        </div>
        <div class="weather-temp-block">
          <div class="weather-temp">${weather.temp}°C</div>
          <div class="weather-icon" title="${weather.label}">${weather.icon}</div>
        </div>
      </div>
      <div class="weather-facts">
        ${park.facts.map((f) => `<span class="weather-fact">${f}</span>`).join('')}
      </div>
    `;
  }

  renderSlide(index, instant = false) {
    const park = WEATHER_PARKS[index];
    const cached = this.weatherData[index];
    const weather = cached?.weather;
    const loading = this.root.classList.contains('is-loading');
    const html = this.getSlideHtml(park, weather, loading);

    const existing = this.viewport.querySelector('.weather-slide.is-active');
    if (instant || !existing) {
      this.viewport.innerHTML = `<div class="weather-slide is-active">${html}</div>`;
      return;
    }
  }

  async transitionTo(nextIndex) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const currentEl = this.viewport.querySelector('.weather-slide.is-active');
    const park = WEATHER_PARKS[nextIndex];
    const cached = this.weatherData[nextIndex];
    const weather = cached?.weather;
    const html = this.getSlideHtml(park, weather, false);

    if (this.overlay) {
      this.overlay.classList.remove('is-sweeping');
      void this.overlay.offsetWidth;
      this.overlay.classList.add('is-sweeping');
    }

    if (currentEl) {
      currentEl.classList.remove('is-active');
      currentEl.classList.add('is-exiting');
    }

    const nextEl = document.createElement('div');
    nextEl.className = 'weather-slide is-entering';
    nextEl.innerHTML = html;
    this.viewport.appendChild(nextEl);

    await this.wait(580);

    if (currentEl) currentEl.remove();
    nextEl.classList.remove('is-entering');
    nextEl.classList.add('is-active');

    this.index = nextIndex;
    this.updateDots();
    this.isAnimating = false;
  }

  wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  next() {
    const nextIndex = (this.index + 1) % WEATHER_PARKS.length;
    return this.transitionTo(nextIndex);
  }

  goTo(index) {
    this.stopAutoplay();
    return this.transitionTo(index).then(() => this.startAutoplay());
  }

  startAutoplay() {
    this.stopAutoplay();
    this.timer = setInterval(() => {
      if (!this.isAnimating) this.next();
    }, this.slideDuration);
  }

  stopAutoplay() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async refreshWeather() {
    await this.loadAllWeather();
    const active = this.viewport.querySelector('.weather-slide.is-active');
    if (active && !this.isAnimating) {
      const park = WEATHER_PARKS[this.index];
      const weather = this.weatherData[this.index]?.weather;
      active.innerHTML = this.getSlideHtml(park, weather, false);
    }
  }
}

function initWeatherWidget() {
  const root = document.getElementById('weather-widget');
  if (!root) return;
  const widget = new HaiboWeatherWidget(root);
  widget.init();
  setInterval(() => widget.refreshWeather(), 30 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', initWeatherWidget);
