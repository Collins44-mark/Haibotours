/**
 * @deprecated CMS uses Firestore only. This file exists so old cached scripts do not call /api/site-cms.
 */
import { emptyCmsDocument, loadCmsSnapshotOnce } from './cms-firestore.mjs';

export { emptyCmsDocument };

/** Read live content from Firestore (never calls /api/site-cms). */
export const fetchSiteCms = loadCmsSnapshotOnce;

/** Admin saves go through admin-cms.mjs → Firestore. */
export async function uploadSiteCms() {
  throw new Error(
    'CMS no longer uses Cloudinary JSON. Hard-refresh the admin page (Cmd+Shift+R), then save again.'
  );
}
