/**
 * Huella digital (hash) de contenido para reseñas.
 *
 * Objetivo: que la misma reseña no se pueda importar dos veces aunque cambie
 * mínimamente — otra fecha, mayúsculas, tildes, emojis, puntuación, espacios,
 * comillas, o pequeñas ediciones del texto.
 *
 * Estrategia en dos niveles:
 *  1) `reviewFingerprint`: hash FNV-1a del texto agresivamente normalizado
 *     (sin fecha, sin puntuación, sin números, sin duplicados de caracteres).
 *  2) `isNearDuplicate`: comparación por similitud de tokens (Jaccard) para
 *     atrapar ediciones menores que cambian el hash.
 */

import type { Review } from "./reviews";

const STOPWORDS = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","y","o","que","en","por","para",
  "con","sin","es","son","muy","mas","más","pero","me","mi","lo","se","su","sus","the","and","a","of",
]);

/** Normaliza texto a su forma canónica comparable. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")          // tildes
    .replace(/[\p{Extended_Pictographic}]/gu, "") // emojis
    .replace(/\d+/g, " ")                      // números y fechas
    .replace(/[^\p{L}\p{N}\s]/gu, " ")        // puntuación
    .replace(/(.)\1{2,}/g, "$1")              // "buenoooo" -> "bueno"
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokens significativos del texto (sin stopwords, ordenados). */
export function contentTokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, "0");
}

/**
 * Hash de contenido de la reseña. Ignora fecha, autor con formato distinto,
 * puntaje y orden de palabras: solo cuenta el contenido real del comentario.
 */
export function reviewFingerprint(review: Pick<Review, "author" | "body" | "title">): string {
  const tokens = contentTokens(`${review.body ?? ""} ${review.title ?? ""}`);
  const canonical = Array.from(new Set(tokens)).sort().join(" ");
  const author = normalizeText(review.author ?? "").split(" ")[0] ?? "";
  // Si el comentario es muy corto, el autor entra en el hash para no colisionar.
  return tokens.length >= 4 ? fnv1a(canonical) : fnv1a(`${author}|${canonical}`);
}

/** Similitud de Jaccard entre los tokens de dos textos (0 a 1). */
export function similarity(a: string, b: string): number {
  const setA = new Set(contentTokens(a));
  const setB = new Set(contentTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / (setA.size + setB.size - inter);
}

/** Umbral por encima del cual dos reseñas se consideran la misma. */
export const NEAR_DUPLICATE_THRESHOLD = 0.82;

/** ¿La reseña ya existe (igual o casi igual) dentro de la lista dada? */
export function isNearDuplicate(review: Review, existing: Review[]): boolean {
  const fp = reviewFingerprint(review);
  for (const other of existing) {
    if (reviewFingerprint(other) === fp) return true;
    if (similarity(review.body ?? "", other.body ?? "") >= NEAR_DUPLICATE_THRESHOLD) return true;
  }
  return false;
}
