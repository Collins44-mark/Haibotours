# HAIBO Tours & Safaris

Luxury Tanzania safari marketing site (static frontend).

## Project structure

```
├── frontend/          # Static site (HTML, CSS, JS, assets)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
```

## Run locally

Use a local server for the weather widget and clean page routing:

```bash
cd frontend
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080)

## Deploy

### Vercel (recommended)

Use **one** of these setups (not both):

**Option A — Root Directory `frontend` (recommended)**  
In the Vercel project: **Settings → General → Root Directory** → `frontend`.  
Framework Preset: **Other**. Leave **Build Command** and **Output Directory** empty.  
Routing is defined in **`frontend/vercel.json`** (not the repo-root file).

| URL | Page |
|-----|------|
| `/admin-login` | Admin sign-in (same app as dashboard) |
| `/admin` or `/admin-dashboard` | CMS dashboard after sign-in |

**Local dev** (`python3 -m http.server` in `frontend/`): open **http://localhost:8080/admin/login.html** to sign in; dashboard is **http://localhost:8080/admin/dashboard.html**.

**Option B — Repo root**  
Leave Root Directory as `.` (repository root). Use the repo-root **`vercel.json`** (paths include `/frontend/`).

After changing settings, click **Redeploy** on the latest deployment.

**Firebase Auth on production:** In Firebase Console → Authentication → Settings → Authorized domains, add your Vercel domain (e.g. `haibotours.vercel.app` and your custom domain).

### GitHub Pages

Set publish directory to **`/frontend`**.

## Responsive design

Mobile layouts use `frontend/css/responsive.css`, `mobile-fixes.css` (no horizontal scroll), and `safari-search.css` on the home page.

## SEO & performance

- Canonical domain: **https://haiboafricatours.co.tz** (`HAIBO_SITE_URL` in `js/config.js`). The same value is
  hardcoded in each public page `<head>`, `robots.txt`, and `api/sitemap.js` — change all of them together.
- Static `<head>` tags (title, description, canonical, Open Graph, Twitter card) in each public page so crawlers and
  link previews work without JavaScript; `js/seo.js` sets per-destination tags at runtime.
- JSON-LD: `TravelAgency` + `WebSite` (contact details read from the live CMS; empty fields are omitted),
  `TouristTrip` + `BreadcrumbList` on destination pages, `ItemList` on the destinations page.
- `/sitemap.xml` is generated on request by `frontend/api/sitemap.js` (static pages + published destinations from
  Firestore, `lastmod` from each destination's `updatedAt`). Unknown/draft destination URLs are set to `noindex`.
- Admin pages: `noindex` meta + `X-Robots-Tag` header, and disallowed in `robots.txt`.
- Cloudinary images auto-optimized (`f_auto`), lazy loading

Submit sitemap in [Google Search Console](https://search.google.com/search-console).

## Safari search

On the home page, users pick destination, date, and travelers. Valid destinations redirect to `destination.html?id=…` (local) or `/destinations/slug` on Vercel. Unknown destinations show a toast: **No safari destination found**.

## Admin CMS (Firebase + Cloudinary)

- **Admin login:** `frontend/admin/login.html` — **Dashboard:** `frontend/admin/dashboard.html`
- **Setup guide:** [firebase/FIREBASE_ADMIN_SETUP.md](firebase/FIREBASE_ADMIN_SETUP.md)
- Configure `frontend/js/firebase-config.js`, add your Auth UID to Firestore `admins/{uid}`, deploy rules, then sign in.
- **Security:** public Firestore read; writes only for users in `admins`; dashboard redirects unauthenticated visitors.
- Images upload to Cloudinary; only URLs are stored in Firestore.
- Public pages use Firestore **realtime listeners** — admin saves update the live site without redeploy.
