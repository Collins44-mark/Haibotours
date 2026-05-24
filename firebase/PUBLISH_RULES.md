# HAIBO — Publish Firestore rules (required for live CMS)

## How the CMS works now

| What | Where |
|------|--------|
| **All text & structure** | **Firestore** (`hero`, `about`, `contact`, `destinations`, `gallery`, …) |
| **Images** | **Cloudinary** (URLs saved in Firestore) |
| **Public website** | `onSnapshot` listeners — updates on **every device instantly** |
| **Admin save** | `setDoc` → console: `Firestore updated successfully` |

No CMS data in `localStorage` / cookies. Firestore is the only source of truth.

## Publish rules (required)

1. Open [Firebase Console](https://console.firebase.google.com) → project **haibo-tours** → **Firestore** → **Rules**
2. Copy all of `firebase/COPY_PASTE_RULES.txt`
3. Click **Publish**

Rules must allow:
- **Public read** on content collections (`hero`, `destinations`, `gallery`, …)
- **Admin write** when `admins/{your-uid}` has `admin: "admin"`

## Admin document

Collection: `admins`  
Document ID: your Firebase Auth UID  
Fields: `admin` = `"admin"`, `role` = `"admin"`

## First-time content

In admin dashboard → **Import website defaults** (writes all sections to Firestore).

## Verify a save worked

1. Save in admin → browser console should show: `Firestore updated successfully`
2. Firebase Console → Firestore → open `destinations/{id}` or `hero/main` → fields and `updatedAt` changed
3. Open site on phone → same content within seconds (no manual refresh needed)

## Optional: Cloudinary API on Vercel

Not required for CMS text. Only needed if you use server-side image tooling.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Save works on laptop only | Publish Firestore rules; confirm `destinations/...` updates in Console |
| `permission-denied` in console | Publish rules + `admins/{uid}` document |
| Phone shows old images | Hard refresh once after deploy; URLs include `?v=updatedAt` cache-bust |
