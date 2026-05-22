/**
 * Reusable Firestore realtime helpers (onSnapshot).
 */
import { doc, collection, query, orderBy, onSnapshot } from './firebase-cdn.mjs';

const activeUnsubs = new Set();

export function unsubscribeAllRealtime() {
  activeUnsubs.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
  activeUnsubs.clear();
}

function trackUnsub(fn) {
  activeUnsubs.add(fn);
  return () => {
    try {
      fn();
    } catch {
      /* ignore */
    }
    activeUnsubs.delete(fn);
  };
}

/**
 * Listen to a single document (e.g. hero/main, settings/main).
 */
export function subscribeDocument(db, coll, docId, handlers = {}) {
  const { onData, onError, onLoading } = handlers;
  onLoading?.(true);

  let innerUnsub = null;
  const ref = doc(db, coll, docId);

  innerUnsub = onSnapshot(
    ref,
    (snap) => {
      onData?.(snap.exists() ? snap.data() : null, snap);
      onLoading?.(false);
    },
    (err) => {
      console.warn(`[HAIBO] document listener error (${coll}/${docId}):`, err);
      onError?.(err);
      onLoading?.(false);
    }
  );

  return trackUnsub(() => {
    if (innerUnsub) innerUnsub();
  });
}

/**
 * Listen to a collection with optional orderBy (falls back to unordered on index errors).
 */
export function subscribeCollection(db, coll, handlers = {}, options = {}) {
  const {
    orderField = 'order',
    orderDirection = 'asc',
    useOrdering = true,
  } = options;
  const { onData, onError, onLoading } = handlers;

  onLoading?.(true);

  let innerUnsub = null;
  let triedPlain = false;

  const attach = (q) => {
    if (innerUnsub) {
      try {
        innerUnsub();
      } catch {
        /* ignore */
      }
    }

    innerUnsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        onData?.(items, snap);
        onLoading?.(false);
      },
      (err) => {
        if (useOrdering && orderField && !triedPlain) {
          triedPlain = true;
          console.warn(`[HAIBO] collection orderBy fallback (${coll}):`, err?.message || err);
          attach(collection(db, coll));
          return;
        }
        console.warn(`[HAIBO] collection listener error (${coll}):`, err);
        onError?.(err);
        onLoading?.(false);
      }
    );
  };

  const collRef = collection(db, coll);
  if (useOrdering && orderField) {
    attach(query(collRef, orderBy(orderField, orderDirection)));
  } else {
    attach(collRef);
  }

  return trackUnsub(() => {
    if (innerUnsub) innerUnsub();
  });
}
