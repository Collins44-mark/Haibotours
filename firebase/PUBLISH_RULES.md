# HAIBO CMS — how content works

The **live website** reads all text, destinations, and image URLs from a JSON file on **Cloudinary**.

The **admin panel** uses **Firebase Authentication only** (email + password). When you save anything in admin, the site JSON is updated on Cloudinary and the public site picks it up within about 25 seconds (or on refresh).

You do **not** need Firestore rules, “Publish to website”, or database setup for content.

## Admin access

1. Add your email to `HAIBO_ADMIN_EMAIL_ALLOWLIST` in `frontend/js/firebase-config.js`.
2. Create the user in Firebase Console → Authentication → Users.
3. Sign in at `/admin/login.html`.

## Images

Upload images in admin (Hero, About, Destinations, etc.). They go to Cloudinary; the URL is saved in the site JSON automatically.

## First-time content

In admin → **Import website defaults** loads the starter destinations and sections onto the live site.

Optional bootstrap from terminal:

```bash
node scripts/seed-public-cms-manifest.mjs
```
