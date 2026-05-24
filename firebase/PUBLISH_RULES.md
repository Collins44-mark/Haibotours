# HAIBO CMS — how content works

The **live website** loads content from Cloudinary (JSON + image URLs).

The **admin panel** uses **Firebase Authentication only** (email + password). When you save, content is pushed to Cloudinary and the public site refreshes automatically.

## Admin access

1. Add your email to `HAIBO_ADMIN_EMAIL_ALLOWLIST` in `frontend/js/firebase-config.js`.
2. Create that user in Firebase Console → Authentication.
3. Sign in at `/admin/login`.

## Cloudinary upload preset (important)

In [Cloudinary Console](https://console.cloudinary.com) → Settings → Upload → your preset `ml_default`:

- Turn **Overwrite** ON if you use a fixed public id (optional; default flow uses a new URL per save).

Without overwrite, only the first save per file sticks; the site may show old data.

## Best live updates (optional, Vercel)

Add environment variables on Vercel for project **haibo-tours** site:

| Variable | Purpose |
|----------|---------|
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `CLOUDINARY_CLOUD_NAME` | `dae3rpnmg` (optional, default in code) |

Then `/api/site-cms` can list the newest `haibo/cms/m-*` backup for all visitors (not only the browser that saved).

Without API keys, saves still sync to **minute buckets** (`haibo/cms/v-*`) as a fallback.

## Cross-device sync (required once)

Publish `firebase/firestore.rules` (includes **`cmsMeta`** — public read, admin write).

When you save in admin, the app writes **`cmsMeta/live`** with the latest Cloudinary JSON URL. Every phone and laptop reads that pointer (live listener + polling).

## First-time content

Admin → **Import website defaults**, or run:

```bash
node scripts/seed-public-cms-manifest.mjs
```
