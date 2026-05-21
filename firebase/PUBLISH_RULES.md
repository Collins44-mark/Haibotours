# Publish Firestore rules (fix “Firestore blocked reading admins/…”)

Your UID: **`2Fon2CNGTfSHF84miZ4GsKGSc6w1`** — use this exact ID as the Firestore document ID.

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

## Verify

In browser console you should see:

`[HAIBO Admin Auth] admin verified 2Fon2CNGTfSHF84miZ4GsKGSc6w1`

Not `permission-denied`.
