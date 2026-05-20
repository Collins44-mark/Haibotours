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

Host the **`frontend`** folder (e.g. GitHub Pages — set publish directory to `/frontend`).

## Responsive design

Mobile layouts use `frontend/css/responsive.css` plus multi-column gallery and destination grids on phones.
