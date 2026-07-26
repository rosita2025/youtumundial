/**
 * Cola de moderación de reseñas importadas.
 *
 * Todo lo que entra por URL de 1688, pegado, archivo HTML o CSV/JSON queda
 * primero acá con su evidencia (autor, estrellas, fotos, origen). Recién al
 * aprobarlas pasan al store publicado y se ven en la ficha del producto.
 *
 * Se guarda en el navegador (localStorage), igual que las publicadas.
 */

import type { Review } from "./reviews";
import { reviewFingerprint } from "./fingerprint";

export const PENDING_REVIEWS_KEY = "youtumundial:reviews-pendientes";

export type PendingSource = "url" | "pegado" | "archivo";

export interface PendingReview {
  id: string;
  slug: string;
  review: Review;
  /** Evidencia capturada en el momento de la importación. */
  evidence: {
    source: PendingSource;
    /** URL de 1688 o nombre del archivo del que salió. */
    origin: string;
    productTitle?: string;
    importedAt: string;
    author: string;
    rating: number;
    photos: string[];
    /** Texto original sin traducir, si el importador lo capturó. */
    original?: string;
  };
}

const listeners = new Set<() => void>();

export function readPending(): PendingReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_REVIEWS_KEY);
    const parsed = raw ? (JSON.parse(raw) as { pending?: PendingReview[] }) : null;
    return Array.isArray(parsed?.pending) ? parsed!.pending : [];
  } catch {
    return [];
  }
}

export function writePending(pending: PendingReview[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_REVIEWS_KEY, JSON.stringify({ pending }));
  listeners.forEach((l) => l());
}

export function subscribePending(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PENDING_REVIEWS_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const idFor = (slug: string, review: Review) => `${slug}::${reviewFingerprint(review)}`;

/**
 * Agrega reseñas a la cola de revisión. Devuelve cuántas entraron y cuántas
 * se descartaron por estar ya pendientes (mismo hash de contenido).
 */
export function queueForReview(
  slug: string,
  reviews: Review[],
  evidence: Omit<PendingReview["evidence"], "author" | "rating" | "photos" | "importedAt"> & {
    importedAt?: string;
  },
): { queued: number; duplicates: number } {
  const current = readPending();
  const known = new Set(current.map((p) => p.id));
  const importedAt = evidence.importedAt ?? new Date().toISOString();
  let queued = 0;
  let duplicates = 0;

  for (const review of reviews) {
    const id = idFor(slug, review);
    if (known.has(id)) {
      duplicates++;
      continue;
    }
    known.add(id);
    current.push({
      id,
      slug,
      review,
      evidence: {
        source: evidence.source,
        origin: evidence.origin,
        productTitle: evidence.productTitle,
        importedAt,
        author: review.author,
        rating: review.rating,
        photos: review.photos ?? [],
      },
    });
    queued++;
  }

  writePending(current);
  return { queued, duplicates };
}

export function removePending(ids: string[]) {
  const drop = new Set(ids);
  writePending(readPending().filter((p) => !drop.has(p.id)));
}

export function clearPending() {
  writePending([]);
}
