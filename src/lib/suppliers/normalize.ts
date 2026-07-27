/**
 * Normaliza un producto crudo de la Open API de SUP al formato `SupRawProduct`
 * que ya usa la tienda (`src/lib/suppliers/sup.ts`).
 */

import type { SupRawProduct } from "./sup";

type AnyRecord = Record<string, unknown>;

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function pick(raw: AnyRecord, keys: string[]): unknown {
  for (const k of keys) if (raw[k] !== undefined && raw[k] !== null && raw[k] !== "") return raw[k];
  return undefined;
}

function toStringList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : str((v as AnyRecord)?.name ?? (v as AnyRecord)?.value ?? (v as AnyRecord)?.url)))
      .filter(Boolean);
  }
  if (typeof value === "string") return value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Extrae tallas y colores desde variantes o listas de opciones. */
function extractOptions(raw: AnyRecord) {
  const sizes = new Set(toStringList(pick(raw, ["sizes", "size_list", "sizeList"])));
  const colors = new Set(toStringList(pick(raw, ["colors", "color_list", "colorList"])));

  const variants = pick(raw, ["variants", "skus", "sku_list", "skuList", "variations"]);
  if (Array.isArray(variants)) {
    for (const v of variants as AnyRecord[]) {
      const size = str(pick(v, ["size", "size_name", "spec_size"]));
      const color = str(pick(v, ["color", "color_name", "spec_color"]));
      if (size) sizes.add(size);
      if (color) colors.add(color);
    }
  }
  return { sizes: [...sizes], colors: [...colors] };
}

export function normalizeSupProduct(raw: AnyRecord): SupRawProduct {
  const { sizes, colors } = extractOptions(raw);
  const images = toStringList(pick(raw, ["images", "image_list", "imageList", "pictures", "album", "imgs"]));
  const main = str(pick(raw, ["pre_img", "image", "main_image", "mainImage", "cover", "thumb"]));
  if (main && !images.includes(main)) images.unshift(main);

  return {
    id: str(pick(raw, ["id", "product_id", "productId", "goods_sn", "spu", "spu_id", "sku"])) || String(Date.now()),
    name: str(pick(raw, ["title", "name", "title_en", "product_name", "productName"])) || "Producto SUP",
    description: str(pick(raw, ["description", "desc", "detail", "content", "title_en"])),
    cost_price: num(pick(raw, ["min_price", "price", "cost_price", "sale_price", "supply_price"])),

    images,
    sizes,
    colors,
    categories: toStringList(pick(raw, ["categories", "category", "category_name"])),
    tags: toStringList(pick(raw, ["tags", "keywords"])),
    stock: pick(raw, ["stock", "inventory", "quantity"]) === undefined
      ? undefined
      : num(pick(raw, ["stock", "inventory", "quantity"])),
  };
}

export function normalizeSupProducts(raws: AnyRecord[]): SupRawProduct[] {
  return raws.map(normalizeSupProduct).filter((p) => p.name);
}
