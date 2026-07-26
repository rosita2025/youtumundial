/**
 * Diagnóstico de reseñas por slug de producto.
 *
 * Responde por qué una ficha /products/:sku no muestra reseñas propias:
 *  - el slug no existe en el catálogo
 *  - el JSON de importación está vacío
 *  - las reseñas quedaron guardadas bajo otro slug (mapeo mal)
 *  - el merge las dedupó todas
 */

import { importedReviews, reviewOverrides, type Review } from "./reviews";
import { reviewKey, type ReviewsBySlug } from "./import-1688";

export type ReviewSource = "overrides" | "local" | "file" | "generic";

export interface SlugDiagnosis {
  slug: string;
  existsInCatalog: boolean;
  counts: { overrides: number; local: number; file: number };
  /** De dónde salen las reseñas que ve el visitante. */
  source: ReviewSource;
  /** Reseñas propias (sin contar el pool genérico). */
  ownTotal: number;
  /** Reseñas propias descartadas por ser duplicado exacto (autor + texto). */
  duplicatesDropped: number;
  /** Slugs parecidos que sí tienen reseñas cargadas (posible mapeo mal hecho). */
  suggestions: string[];
  /** Diagnóstico principal en español. */
  problem: string | null;
  hint: string | null;
}

export interface StoreDiagnosis {
  catalogSlugs: string[];
  fileTotal: number;
  localTotal: number;
  overridesTotal: number;
  /** Slugs con reseñas cargadas que no existen en el catálogo. */
  orphanSlugs: { slug: string; count: number; suggestion: string | null }[];
  /** Productos del catálogo sin reseñas propias (usan el pool genérico). */
  slugsWithoutOwnReviews: string[];
}

const total = (map: ReviewsBySlug) =>
  Object.values(map).reduce((s, l) => s + (l?.length ?? 0), 0);

/** Distancia de edición simple para sugerir el slug correcto. */
function distance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

export function closestSlug(slug: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const d = distance(slug, c);
    if (d < bestScore) {
      bestScore = d;
      best = c;
    }
  }
  if (!best) return null;
  const limit = Math.max(4, Math.round(Math.max(slug.length, best.length) * 0.5));
  return bestScore <= limit ? best : null;
}

function uniqueCount(list: Review[]) {
  return new Set(list.map(reviewKey)).size;
}

export function diagnoseSlug(
  slug: string,
  catalogSlugs: string[],
  localReviews: ReviewsBySlug,
): SlugDiagnosis {
  const clean = slug.trim();
  const overrides = reviewOverrides[clean] ?? [];
  const local = localReviews[clean] ?? [];
  const file = (importedReviews as ReviewsBySlug)[clean] ?? [];

  const existsInCatalog = catalogSlugs.includes(clean);
  const own = overrides.length ? overrides : local.length ? local : file;
  const source: ReviewSource = overrides.length
    ? "overrides"
    : local.length
      ? "local"
      : file.length
        ? "file"
        : "generic";

  const duplicatesDropped = own.length - uniqueCount(own);

  const loadedSlugs = [
    ...new Set([
      ...Object.keys(importedReviews),
      ...Object.keys(localReviews),
      ...Object.keys(reviewOverrides),
    ]),
  ].filter((s) => s !== clean);

  const suggestions = loadedSlugs
    .map((s) => ({ s, d: distance(clean, s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .filter((x) => x.d <= Math.max(4, Math.round(clean.length * 0.6)))
    .map((x) => x.s);

  let problem: string | null = null;
  let hint: string | null = null;

  if (!existsInCatalog) {
    problem = `El slug "${clean}" no existe en el catálogo, así que /products/${clean} no abre ninguna ficha.`;
    hint =
      closestSlug(clean, catalogSlugs)
        ? `¿Quisiste decir "${closestSlug(clean, catalogSlugs)}"? Usá el botón de corregir mapeo.`
        : "Revisá el slug exacto en la lista de productos de abajo.";
  } else if (source === "generic") {
    if (total(importedReviews as ReviewsBySlug) === 0 && total(localReviews) === 0) {
      problem = "No hay ninguna reseña importada todavía: el archivo reviews-1688.json está vacío y no hay nada publicado en este navegador.";
      hint = "Importá reseñas desde /admin/resenas (URL de 1688, CSV o JSON) y tocá «Publicar en la tienda».";
    } else if (suggestions.length) {
      problem = `Hay reseñas cargadas, pero ninguna bajo el slug "${clean}". Quedaron guardadas con otro slug.`;
      hint = `Slug parecido con reseñas: "${suggestions[0]}". Corregí el mapeo para moverlas a "${clean}".`;
    } else {
      problem = `Este producto no tiene reseñas propias; se muestra el pool genérico de ejemplo.`;
      hint = "Importá reseñas para este slug desde /admin/resenas.";
    }
  } else if (duplicatesDropped > 0 && uniqueCount(own) === 0) {
    problem = "Todas las reseñas de este producto se descartaron por duplicadas (mismo autor y mismo texto).";
    hint = "Revisá el export: variá autor o texto, o importá reseñas distintas.";
  }

  return {
    slug: clean,
    existsInCatalog,
    counts: { overrides: overrides.length, local: local.length, file: file.length },
    source,
    ownTotal: own.length,
    duplicatesDropped,
    suggestions,
    problem,
    hint,
  };
}

export function diagnoseStore(
  catalogSlugs: string[],
  localReviews: ReviewsBySlug,
): StoreDiagnosis {
  const file = importedReviews as ReviewsBySlug;
  const loaded = new Map<string, number>();
  for (const [s, l] of Object.entries(file)) loaded.set(s, (loaded.get(s) ?? 0) + (l?.length ?? 0));
  for (const [s, l] of Object.entries(localReviews)) loaded.set(s, (loaded.get(s) ?? 0) + (l?.length ?? 0));

  const orphanSlugs = [...loaded.entries()]
    .filter(([s, count]) => count > 0 && !catalogSlugs.includes(s))
    .map(([slug, count]) => ({ slug, count, suggestion: closestSlug(slug, catalogSlugs) }));

  const slugsWithoutOwnReviews = catalogSlugs.filter(
    (s) => !(reviewOverrides[s]?.length || localReviews[s]?.length || file[s]?.length),
  );

  return {
    catalogSlugs,
    fileTotal: total(file),
    localTotal: total(localReviews),
    overridesTotal: total(reviewOverrides as ReviewsBySlug),
    orphanSlugs,
    slugsWithoutOwnReviews,
  };
}

/** Mueve las reseñas de un slug a otro dentro del mapa publicado, sin duplicar. */
export function remapSlug(
  reviews: ReviewsBySlug,
  from: string,
  to: string,
): { reviews: ReviewsBySlug; moved: number; duplicates: number } {
  const next: ReviewsBySlug = {};
  for (const [slug, list] of Object.entries(reviews)) next[slug] = [...(list ?? [])];

  const fileFrom = (importedReviews as ReviewsBySlug)[from] ?? [];
  const source = [...(next[from] ?? []), ...fileFrom];
  delete next[from];

  const target = (next[to] ||= [...((importedReviews as ReviewsBySlug)[to] ?? [])]);
  const keys = new Set(target.map(reviewKey));

  let moved = 0;
  let duplicates = 0;
  for (const review of source) {
    const key = reviewKey(review);
    if (keys.has(key)) {
      duplicates++;
      continue;
    }
    keys.add(key);
    target.push(review);
    moved++;
  }
  target.sort((a, b) => b.date.localeCompare(a.date));
  if (target.length === 0) delete next[to];

  return { reviews: next, moved, duplicates };
}
