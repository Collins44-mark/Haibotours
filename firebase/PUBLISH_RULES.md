# Publish Firestore rules (required for live website + admin)

**If the public website shows empty destinations or never updates:** Firestore is returning `permission-denied` to visitors. The rules in this repo allow **public read** on `destinations`, `hero`, `gallery`, etc. They must be **published** in Firebase Console.

**Until rules are published:** the site can still load CMS data from a **Cloudinary JSON manifest**. After you save or import destinations in admin, the app publishes `haibo/cms/public-content.json` automatically. Visitors see that content (not Firestore realtime). Publish Firestore rules when you want instant `onSnapshot` updates without re-saving.

Your UID: **`2Fon2CNGTfSHF84miZ4GsKGSc6w1`** — use this exact ID as the Firestore document ID.

## Public website (visitors) — must allow read without login

After publishing `firebase/firestore.rules`, open the homepage and confirm the console shows:

- `[HAIBO] destinations from Firestore` or `Realtime update received`
- **Not** `permission-denied`

Optional: enable **Authentication → Sign-in method → Anonymous** in Firebase Console (helps if old rules required any signed-in user).

## Option A — Firebase Console (fastest)

1. Open [Firebase Console](https://console.firebase.google.com) → project **haibo-tours**.
2. **Firestore Database** → **Rules** tab.
3. Replace all rules with the contents of `firebase/firestore.rules` in this repo.
4. Click **Publish**.

## Option B — CLI (from repo root)

```bash
firebase login
firebase deploy --only firestore:rules --project haibo-tours
```

## After rules are published

### Automatic (recommended)

1. Hard refresh admin: http://localhost:8080/admin/index.html  
2. Sign in again — the app will create `admins/2Fon2CNGTfSHF84miZ4GsKGSc6w1` for you.

### Manual (if needed)

1. Firestore Database → **Start collection** (or open `admins`).
2. Collection ID: `admins`
3. Document ID: `2Fon2CNGTfSHF84miZ4GsKGSc6w1` (copy from Authentication → Users → UID).
4. Add fields:

| Field | Type | Value |
|-------|------|--------|
| `admin` | string | `admin` |
| `role` | string | `admin` |
| `email` | string | your login email |

5. Save, then sign in again.

## Verify (from repo root)

```bash
node scripts/check-firestore-public-read.mjs
```

- **FAIL + PERMISSION_DENIED** — rules are not published yet (this is why the public site shows no CMS data).
- **OK** — hard-refresh the homepage; console should show `[HAIBO] Realtime update received` with destination count &gt; 0.

In admin browser console you should see `admin verified` for your UID, not `permission-denied` on writes.
