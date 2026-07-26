/**
 * Importador de reseñas de 1688 / SUP Dropshipping.
 *
 * Lógica compartida entre el script de terminal
 * (`scripts/import-1688-reviews.ts`) y el panel de admin (`/admin/resenas`).
 * No usa APIs de Node ni del navegador: funciona en los dos lados.
 */

import type { Review } from "./reviews";

export type ReviewsBySlug = Record<string, Review[]>;

export interface ParseResult {
  /** Reseñas válidas agrupadas por slug de producto. */
  bySlug: ReviewsBySlug;
  /** Filas totales encontradas en el archivo. */
  rows: number;
  /** Filas descartadas por no tener slug o texto. */
  skipped: number;
  /** Duplicados detectados dentro del mismo archivo. */
  duplicatesInFile: number;
  /** Slugs encontrados. */
  slugs: string[];
}

export interface MergeResult {
  merged: ReviewsBySlug;
  added: number;
  duplicates: number;
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if ((c === "," || c === ";" || c === "\t") && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^\ufeff/, ""));
  return lines
    .slice(1)
    .filter((l) => l.trim() !== "")
    .map((line) => {
      const cells = splitCsvLine(line);
      return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
    });
}

/* ------------------------------------------------------------------ */
/* Normalización de filas                                              */
/* ------------------------------------------------------------------ */

type RawRow = Record<string, unknown>;

const pick = (row: RawRow, keys: string[]): string => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function toReview(row: RawRow): { slug: string; review: Review } | null {
  const slugRaw = pick(row, ["slug", "product_slug", "handle", "producto", "product", "商品"]);
  const body = pick(row, [
    "body",
    "content",
    "review",
    "comment",
    "texto",
    "resena",
    "reseña",
    "评价内容",
    "内容",
    "评价",
  ]);
  if (!slugRaw || !body) return null;

  const ratingRaw = Number(pick(row, ["rating", "star", "stars", "score", "puntaje", "评分", "星级"]) || 5);
  const photosRaw = (row.photos ?? row.images ?? row.fotos ?? row["图片"] ?? []) as unknown;
  const photos = Array.isArray(photosRaw)
    ? photosRaw.map(String).filter(Boolean)
    : String(photosRaw ?? "")
        .split(/[|;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

  const review: Review = {
    author: pick(row, ["author", "nick", "name", "user", "autor", "cliente", "用户", "买家"]) || "Cliente verificado",
    country: (pick(row, ["country", "pais", "país", "国家"]) || "PE").toUpperCase().slice(0, 2),
    rating: Math.min(5, Math.max(1, Math.round(ratingRaw) || 5)),
    date: (pick(row, ["date", "created_at", "fecha", "时间", "日期"]) || new Date().toISOString()).slice(0, 10),
    title: pick(row, ["title", "titulo", "título", "标题"]) || body.slice(0, 40),
    body,
    verified: true,
  };

  const size = pick(row, ["size", "talla", "规格", "尺码"]);
  if (size) review.size = size;
  if (photos.length) review.photos = photos;

  return { slug: slugify(slugRaw), review };
}

/* ------------------------------------------------------------------ */
/* Deduplicación                                                       */
/* ------------------------------------------------------------------ */

/** Clave de identidad de una reseña: autor + texto normalizado. */
export function reviewKey(review: Review): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  return `${norm(review.author)}::${norm(review.body)}`;
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

/** Parsea un texto CSV o JSON y devuelve las reseñas agrupadas y deduplicadas. */
export function parseReviewsInput(text: string, filename = ""): ParseResult {
  const trimmed = text.trim();
  const looksJson = trimmed.startsWith("[") || trimmed.startsWith("{");
  const isJson = filename.toLowerCase().endsWith(".json") || (!filename.toLowerCase().endsWith(".csv") && looksJson);

  let rows: RawRow[];
  if (isJson) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      rows = parsed as RawRow[];
    } else {
      const obj = parsed as Record<string, unknown>;
      // También acepta el propio formato de salida: { reviews: { slug: [...] } }
      if (obj.reviews && typeof obj.reviews === "object" && !Array.isArray(obj.reviews)) {
        rows = Object.entries(obj.reviews as Record<string, Review[]>).flatMap(([slug, list]) =>
          (list ?? []).map((r) => ({ ...r, slug })),
        );
      } else {
        rows = ((obj.rows ?? obj.data ?? obj.items ?? []) as RawRow[]) ?? [];
      }
    }
  } else {
    rows = parseCsv(trimmed);
  }

  const bySlug: ReviewsBySlug = {};
  const seen = new Set<string>();
  let skipped = 0;
  let duplicatesInFile = 0;

  for (const row of rows) {
    const parsed = toReview(row);
    if (!parsed) {
      skipped++;
      continue;
    }
    const key = `${parsed.slug}::${reviewKey(parsed.review)}`;
    if (seen.has(key)) {
      duplicatesInFile++;
      continue;
    }
    seen.add(key);
    (bySlug[parsed.slug] ||= []).push(parsed.review);
  }

  for (const slug of Object.keys(bySlug)) {
    bySlug[slug].sort((a, b) => b.date.localeCompare(a.date));
  }

  return {
    bySlug,
    rows: rows.length,
    skipped,
    duplicatesInFile,
    slugs: Object.keys(bySlug).sort(),
  };
}

/** Fusiona reseñas nuevas con las existentes, descartando duplicados por slug. */
export function mergeReviews(existing: ReviewsBySlug, incoming: ReviewsBySlug): MergeResult {
  const merged: ReviewsBySlug = {};
  for (const [slug, list] of Object.entries(existing)) merged[slug] = [...(list ?? [])];

  let added = 0;
  let duplicates = 0;

  for (const [slug, list] of Object.entries(incoming)) {
    const current = (merged[slug] ||= []);
    const keys = new Set(current.map(reviewKey));
    for (const review of list) {
      const key = reviewKey(review);
      if (keys.has(key)) {
        duplicates++;
        continue;
      }
      keys.add(key);
      current.push(review);
      added++;
    }
  }

  for (const slug of Object.keys(merged)) {
    merged[slug].sort((a, b) => b.date.localeCompare(a.date));
    if (merged[slug].length === 0) delete merged[slug];
  }

  return { merged, added, duplicates };
}

/** Serializa al formato exacto de src/lib/reviews/reviews-1688.json. */
export function serializeReviewsFile(reviews: ReviewsBySlug): string {
  return (
    JSON.stringify(
      {
        _comment:
          "Reseñas importadas de 1688 / SUP. Clave = slug del producto. Se genera con el panel /admin/resenas o con `bun scripts/import-1688-reviews.ts <archivo>`.",
        reviews,
      },
      null,
      2,
    ) + "\n"
  );
}
