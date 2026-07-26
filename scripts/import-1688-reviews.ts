#!/usr/bin/env bun
/**
 * Importador de reseñas de 1688 / SUP Dropshipping -> tienda Youtumundial.
 *
 * Misma lógica que el panel web /admin/resenas (deduplicación por slug +
 * autor + texto), pero desde la terminal.
 *
 * Uso:
 *   bun scripts/import-1688-reviews.ts data/1688-reviews.csv
 *   bun scripts/import-1688-reviews.ts data/1688-reviews.json --reemplazar
 *
 * Por defecto FUSIONA con las reseñas ya cargadas y descarta duplicados.
 * Con --reemplazar descarta lo anterior y deja solo el archivo nuevo.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseReviewsInput,
  mergeReviews,
  serializeReviewsFile,
  type ReviewsBySlug,
} from "../src/lib/reviews/import-1688";

const OUT = resolve("src/lib/reviews/reviews-1688.json");

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const replace = args.includes("--reemplazar") || args.includes("--replace");

if (!input) {
  console.error("Uso: bun scripts/import-1688-reviews.ts <archivo.json|archivo.csv> [--reemplazar]");
  process.exit(1);
}

const parsed = parseReviewsInput(readFileSync(resolve(input), "utf8"), input);

let existing: ReviewsBySlug = {};
if (!replace) {
  try {
    existing = (JSON.parse(readFileSync(OUT, "utf8")).reviews ?? {}) as ReviewsBySlug;
  } catch {
    existing = {};
  }
}

const { merged, added, duplicates } = mergeReviews(existing, parsed.bySlug);
writeFileSync(OUT, serializeReviewsFile(merged));

const total = Object.values(merged).reduce((s, r) => s + r.length, 0);
console.log(
  `OK: ${added} reseñas nuevas (${duplicates + parsed.duplicatesInFile} duplicadas omitidas, ${parsed.skipped} filas sin slug/texto).\n` +
    `   Total: ${total} reseñas en ${Object.keys(merged).length} productos -> ${OUT}`,
);
