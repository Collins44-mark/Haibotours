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

**Option A — Root Directory (simplest)**  
In the Vercel project: **Settings → General → Root Directory** → set to `frontend`.  
Framework Preset: **Other**. Leave **Build Command** and **Output Directory** empty.  
Do **not** add a second `frontend` path in Output Directory.

**Option B — Repo root**  
Leave Root Directory as `.` (repository root). The included `vercel.json` rewrites `/` to `frontend/index.html` and static assets to `frontend/`.

After changing settings, click **Redeploy** on the latest deployment.

### GitHub Pages

Set publish directory to **`/frontend`**.

## Responsive design

Mobile layouts use `frontend/css/responsive.css`, `mobile-fixes.css` (no horizontal scroll), and `safari-search.css` on the home page.

## Safari search

On the home page, users pick destination, date, and travelers. Valid destinations redirect to `destination.html?id=…` (local) or `/destinations/slug` on Vercel. Unknown destinations show a toast: **No safari package found**.
