#!/usr/bin/env node
/**
 * Importador de reseñas de 1688 / SUP Dropshipping -> tienda Youtumundial.
 *
 * NO existe API pública de 1688, así que este script acepta lo que sí se puede
 * conseguir: un archivo JSON o CSV con las reseñas (exportado con una extensión
 * de scraping, copiado a mano, o pedido al proveedor).
 *
 * Uso:
 *   node scripts/import-1688-reviews.mjs data/1688-reviews.json
 *   node scripts/import-1688-reviews.mjs data/1688-reviews.csv
 *
 * Formato JSON aceptado (array o { rows: [...] }):
 *   [{ slug, author|nick|用户, rating|star|评分, date|时间, title, body|content|评价内容,
 *      size|规格, country, photos: ["url", ...] }]
 *
 * Formato CSV: misma cabecera (slug,author,rating,date,title,body,size,country,photos)
 * donde `photos` son URLs separadas por `|`.
 *
 * Resultado: escribe src/lib/reviews/reviews-1688.json, que la tienda usa
 * automáticamente por slug de producto.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("src/lib/reviews/reviews-1688.json");
const input = process.argv[2];
if (!input) {
  console.error("Uso: node scripts/import-1688-reviews.mjs <archivo.json|archivo.csv>");
  process.exit(1);
}

const raw = readFileSync(resolve(input), "utf8");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const head = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (c === "," && !quoted) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const pick = (row, keys) => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const rows = input.endsWith(".csv")
  ? parseCsv(raw)
  : (() => { const j = JSON.parse(raw); return Array.isArray(j) ? j : j.rows ?? j.data ?? []; })();

const bySlug = {};
let skipped = 0;

for (const row of rows) {
  const slug = pick(row, ["slug", "product_slug", "handle"]);
  const body = pick(row, ["body", "content", "review", "comment", "评价内容", "内容"]);
  if (!slug || !body) { skipped++; continue; }

  const ratingRaw = Number(pick(row, ["rating", "star", "stars", "score", "评分"]) || 5);
  const photosRaw = row.photos ?? row.images ?? row["图片"] ?? [];
  const photos = Array.isArray(photosRaw)
    ? photosRaw.filter(Boolean)
    : String(photosRaw).split("|").map((s) => s.trim()).filter(Boolean);

  const review = {
    author: pick(row, ["author", "nick", "name", "user", "用户", "买家"]) || "Cliente verificado",
    country: (pick(row, ["country", "pais"]) || "PE").toUpperCase().slice(0, 2),
    rating: Math.min(5, Math.max(1, Math.round(ratingRaw) || 5)),
    date: (pick(row, ["date", "created_at", "时间", "日期"]) || new Date().toISOString()).slice(0, 10),
    title: pick(row, ["title", "titulo"]) || body.slice(0, 40),
    body,
    verified: true,
  };
  const size = pick(row, ["size", "talla", "规格", "尺码"]);
  if (size) review.size = size;
  if (photos.length) review.photos = photos;

  (bySlug[slug] ||= []).push(review);
}

for (const slug of Object.keys(bySlug)) {
  bySlug[slug].sort((a, b) => b.date.localeCompare(a.date));
}

writeFileSync(
  OUT,
  JSON.stringify(
    {
      _comment: "Generado por scripts/import-1688-reviews.mjs. También se puede editar a mano.",
      reviews: bySlug,
    },
    null,
    2,
  ) + "\n",
);

const total = Object.values(bySlug).reduce((s, r) => s + r.length, 0);
console.log(`OK: ${total} reseñas en ${Object.keys(bySlug).length} productos -> ${OUT}` + (skipped ? ` (${skipped} filas ignoradas por falta de slug/texto)` : ""));
