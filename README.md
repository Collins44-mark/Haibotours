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

**Local dev** (`python3 -m http.server` in `frontend/`): open **http://localhost:8080/admin/index.html** (or `/admin/`). `/admin-login` redirects there automatically.

**Option B — Repo root**  
Leave Root Directory as `.` (repository root). Use the repo-root **`vercel.json`** (paths include `/frontend/`).

After changing settings, click **Redeploy** on the latest deployment.

**Firebase Auth on production:** In Firebase Console → Authentication → Settings → Authorized domains, add your Vercel domain (e.g. `haibotours.vercel.app` and your custom domain).

### GitHub Pages

Set publish directory to **`/frontend`**.

## Responsive design

Mobile layouts use `frontend/css/responsive.css`, `mobile-fixes.css` (no horizontal scroll), and `safari-search.css` on the home page.

## SEO & performance

- Dynamic meta titles, descriptions, canonical URLs, Open Graph, and Twitter cards (`js/seo.js`)
- JSON-LD: `TravelAgency`, `WebSite`, `TouristTrip`, `BreadcrumbList`, `ItemList`
- `robots.txt` and `sitemap.xml` (regenerate: `node scripts/generate-sitemap.js https://your-domain.com`)
- Cloudinary/Unsplash images auto-optimized to WebP (`f_auto` / `fm=webp`), lazy loading
- Set production domain in `js/config.js` → `siteUrl`

Submit sitemap in [Google Search Console](https://search.google.com/search-console).

## Safari search

On the home page, users pick destination, date, and travelers. Valid destinations redirect to `destination.html?id=…` (local) or `/destinations/slug` on Vercel. Unknown destinations show a toast: **No safari destination found**.

## Admin CMS (Firebase + Cloudinary)

- **Admin:** `frontend/admin/index.html` (local: http://localhost:8080/admin/index.html)
- **Setup guide:** [firebase/FIREBASE_ADMIN_SETUP.md](firebase/FIREBASE_ADMIN_SETUP.md)
- Configure `frontend/js/firebase-config.js`, add your Auth UID to Firestore `admins/{uid}`, deploy rules, then sign in.
- **Security:** public Firestore read; writes only for users in `admins`; dashboard redirects unauthenticated visitors.
- Images upload to Cloudinary; only URLs are stored in Firestore.
- Public pages use Firestore **realtime listeners** — admin saves update the live site without redeploy.
