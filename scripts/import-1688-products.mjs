#!/usr/bin/env node
/**
 * Importador de productos de 1688 / SUP Dropshipping -> tienda Youtumundial.
 *
 * 1688 no tiene API pública abierta, así que este script acepta lo que sí se
 * puede conseguir: un archivo JSON o CSV con los productos (export de SUP,
 * extensión de scraping, o armado a mano en Excel/Sheets).
 *
 * Uso:
 *   node scripts/import-1688-products.mjs data/1688-products.csv
 *   node scripts/import-1688-products.mjs data/1688-products.json --margin 0.8
 *
 * Columnas aceptadas (español / inglés / chino):
 *   id            | sku | 商品ID
 *   name          | title | nombre | 标题 | 商品名称
 *   description   | descripcion | 描述
 *   cost_price    | price | costo | precio | 价格          (costo en USD)
 *   images        | image | imagenes | 图片                (URLs separadas por |)
 *   sizes         | tallas | 尺码                          (separadas por |)
 *   colors        | colores | 颜色                          (separadas por |)
 *   categories    | collections | categorias | 分类         (slugs separados por |)
 *   tags          | etiquetas
 *   stock         | inventory | 库存
 *
 * Resultado: escribe src/lib/suppliers/sup-catalog.json, que la tienda usa
 * automáticamente como catálogo (si está vacío se muestra el catálogo demo).
 * El precio de venta se calcula en la tienda: costo + margen (60% por defecto).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("src/lib/suppliers/sup-catalog.json");

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const marginArg = args.indexOf("--margin");
const margin = marginArg !== -1 ? Number(args[marginArg + 1]) : null;

if (!input) {
  console.error("Uso: node scripts/import-1688-products.mjs <archivo.json|archivo.csv> [--margin 0.6]");
  process.exit(1);
}

const raw = readFileSync(resolve(input), "utf8");

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

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const head = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}

const pick = (row, keys) => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const list = (row, keys) => {
  for (const k of keys) {
    const v = row[k];
    if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).split(/[|;\n]/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

const rows = input.endsWith(".csv")
  ? parseCsv(raw)
  : (() => { const j = JSON.parse(raw); return Array.isArray(j) ? j : j.rows ?? j.data ?? j.products ?? []; })();

const products = [];
let skipped = 0;

rows.forEach((row, index) => {
  const name = pick(row, ["name", "title", "nombre", "producto", "标题", "商品名称"]);
  const costRaw = pick(row, ["cost_price", "cost", "costo", "price", "precio", "价格", "成本价"]);
  const cost = parseFloat(String(costRaw).replace(/[^0-9.,]/g, "").replace(",", "."));

  if (!name || !Number.isFinite(cost)) { skipped++; return; }

  const stockRaw = pick(row, ["stock", "inventory", "cantidad", "库存"]);

  const product = {
    id: pick(row, ["id", "sku", "product_id", "spu", "商品ID"]) || `p${index + 1}`,
    name,
    description: pick(row, ["description", "descripcion", "detalle", "描述", "详情"]),
    cost_price: cost,
    images: list(row, ["images", "image", "imagenes", "fotos", "图片", "主图"]),
    sizes: list(row, ["sizes", "size", "tallas", "talla", "尺码"]),
    colors: list(row, ["colors", "color", "colores", "颜色"]),
    categories: list(row, ["categories", "collections", "categorias", "categoria", "分类"]),
    tags: list(row, ["tags", "etiquetas", "标签"]),
  };

  if (stockRaw !== "") {
    const stock = parseInt(String(stockRaw).replace(/[^0-9-]/g, ""), 10);
    if (Number.isFinite(stock)) product.stock = stock;
  }

  products.push(product);
});

writeFileSync(OUT, JSON.stringify(products, null, 2) + "\n");

console.log(
  `OK: ${products.length} productos -> ${OUT}` +
    (skipped ? ` (${skipped} filas ignoradas por falta de nombre o precio)` : "") +
    (margin !== null && Number.isFinite(margin)
      ? `\nNota: para cambiar el margen editá DEFAULT_MARGIN en src/lib/suppliers/sup.ts (pediste ${margin}).`
      : ""),
);
