#!/usr/bin/env node
/**
 * Verifies haibo-tours Firestore allows public read on destinations (matches firebase/firestore.rules).
 * Exit 0 = OK, 1 = rules not published or collection empty.
 */
const PROJECT_ID = 'haibo-tours';
const API_KEY = 'AIzaSyD3e2_hvED03guKtaK_UuhbREF_P871RHc';
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/destinations?pageSize=1&key=${API_KEY}`;

const res = await fetch(url);
const body = await res.json().catch(() => ({}));

if (body?.error?.status === 'PERMISSION_DENIED') {
  console.error('FAIL: Firestore returned PERMISSION_DENIED for public destinations read.');
  console.error('Publish firebase/COPY_PASTE_RULES.txt in Firebase Console → Firestore → Rules → Publish.');
  console.error('Rules editor: https://console.firebase.google.com/project/haibo-tours/firestore/databases/-default-/rules');
  process.exit(1);
}

if (!res.ok) {
  console.error('FAIL: Unexpected response', res.status, body);
  process.exit(1);
}

const count = body.documents?.length ?? 0;
if (count === 0) {
  console.warn('OK: Rules allow public read, but destinations collection is empty — save destinations in admin.');
  process.exit(0);
}

console.log('OK: Public read works. Sample doc:', body.documents[0].name);
process.exit(0);
