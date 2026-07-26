/**
 * Reseñas publicadas desde el panel /admin/resenas sin necesidad de Cloud.
 *
 * Se guardan en el navegador (localStorage) y la tienda las muestra igual que
 * las del archivo reviews-1688.json. Para dejarlas fijas para todos los
 * visitantes hay que reemplazar src/lib/reviews/reviews-1688.json.
 */

import type { Review } from "./reviews";

export const LOCAL_REVIEWS_KEY = "youtumundial:reviews-1688";

export type ReviewsBySlugMap = Record<string, Review[]>;

const listeners = new Set<() => void>();
let cache: ReviewsBySlugMap = {};
let cacheRaw: string | null = null;

export function readLocalReviews(): ReviewsBySlugMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (raw === cacheRaw) return cache;
    cacheRaw = raw;
    cache = raw ? ((JSON.parse(raw) as { reviews?: ReviewsBySlugMap }).reviews ?? {}) : {};
    return cache;
  } catch {
    cache = {};
    return cache;
  }
}

export function writeLocalReviews(reviews: ReviewsBySlugMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify({ reviews }));
  cacheRaw = null;
  listeners.forEach((l) => l());
}

export function clearLocalReviews() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_REVIEWS_KEY);
  cacheRaw = null;
  listeners.forEach((l) => l());
}

export function subscribeLocalReviews(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_REVIEWS_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
