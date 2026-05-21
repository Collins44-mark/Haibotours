# HAIBO — Firebase & Admin Setup

## 1. Firebase project

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** → Email/Password → Add your admin user.
3. Enable **Firestore** (production mode).
4. Project settings → Your apps → Web app → copy config into `frontend/js/firebase-config.js`.

5. **Admin access** (automatic after rules deploy):

   - Create the user under **Authentication** → Email/Password.
   - Deploy `firebase/firestore.rules` (allows each user to create `admins/{their-uid}` on first sign-in).
   - Sign in at `/admin` — the app creates `admins/{uid}` automatically.

   Manual option: Firestore → collection `admins` → document ID = Auth **UID** (empty doc is OK).

6. Deploy security rules (from repo root):

```bash
npx firebase-tools deploy --only firestore:rules --project haibo-tours
```

Or with Firebase CLI installed:

```bash
firebase deploy --only firestore:rules
```

Rules summary (`firebase/firestore.rules`):

- **Read:** all CMS collections are public (website visitors).
- **Write:** only authenticated users with `admins/{uid}` document (`admin: "admin"` or `role: "admin"`).
- **`admins` collection:** each signed-in user may read/create/update **only** their own `admins/{uid}` doc.

**If you see “Firestore blocked reading admins/…”** → rules are not published yet. See [PUBLISH_RULES.md](./PUBLISH_RULES.md).

## 2. Cloudinary

Already configured in `firebase-config.js`:

- Cloud name: `dae3rpnmg`
- Upload preset: `ml_default` (unsigned)

In Cloudinary dashboard:

1. Settings → Upload → Upload presets → `ml_default`
2. Set **unsigned** uploads enabled.
3. Optional: allow **folder** in upload options.

Images upload to `haibo/hero`, `haibo/destinations`, etc. Only **URLs** are stored in Firestore.

## 3. First-time content

1. Open `/admin/login.html`.
2. Sign in with your Firebase admin email/password (must have `admins/{uid}` document).
3. Click **Import website defaults**.
4. Edit sections and save. The public site updates live via Firestore listeners.

## 4. Admin security (client)

| Feature | Behavior |
|---------|----------|
| Session | `browserLocalPersistence` — stay signed in across browser restarts |
| Route guard | Dashboard redirects to login if not signed in |
| Admin allowlist | Non-admin Firebase users are signed out and shown an error |
| Loading | Spinner while auth state is restored |
| Logout | Clears session and redirects to login |
| Errors | Friendly messages (no raw Firebase codes in UI) |

## 5. Admin URL

| Page | Path |
|------|------|
| Login | `/admin/login.html` |
| Dashboard | `/admin/index.html` |

On Vercel with repo root deploy, paths are under `/frontend/admin/…` unless Root Directory is set to `frontend`.

## 6. Firestore collections

| Collection | Document ID | Purpose |
|------------|-------------|---------|
| `admins` | `{firebase-auth-uid}` | Write allowlist (Console only) |
| `hero` | `main` | Home hero |
| `about` | `main` | About section |
| `contact` | `main` | Contact details |
| `socials` | `main` | Social links |
| `settings` | `main` | Logo, nav, footer, search |
| `destinations` | `{slug}` | Destination pages |
| `gallery` | auto id | Photos & videos |
| `weatherCards` | `{slug}` | Weather slider |

## 7. Vercel rewrites

`vercel.json` includes `/admin` and `/admin/login` rewrites. Static hosting cannot enforce server-side auth; protection is **Firestore rules** + **client auth guard**.

## 8. SDK architecture

- **Public site:** `firebase-config.js` + `content-store.mjs` (read-only listeners)
- **Admin:** `admin-auth-guard.mjs`, `admin-firebase.mjs`, `admin-db.mjs`, `admin-app.mjs`
- SDK version: `10.14.1`

## 9. Without Firebase

If `firebase-config.js` keys are empty, the site uses static fallback data — no admin writes.
