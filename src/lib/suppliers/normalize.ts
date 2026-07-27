/**
 * Normaliza un producto crudo de la Open API de SUP al formato `SupRawProduct`
 * que ya usa la tienda (`src/lib/suppliers/sup.ts`).
 */

import type { SupRawProduct, SupRawVariant } from "./sup";

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

function normalizeUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http://")) return url.replace(/^http:/, "https:");
  return url;
}

function parseVariantTitle(value: string) {
  const cleaned = value.replace(/[\u4e00-\u9fff]+/g, "").trim();
  const sizeMatch = cleaned.match(/(?:^|\b)(XXXL|XXL|XL|L|M|S|XS|\dXL|\d+)(?:\b|$)/i);
  const size = sizeMatch?.[1]?.toUpperCase() ?? "";
  const color = sizeMatch ? cleaned.replace(sizeMatch[0], "").trim() : cleaned;
  return { size, color };
}

function idValue(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") return value;
  return undefined;
}

function normalizeVariants(value: unknown): SupRawVariant[] {
  if (!Array.isArray(value)) return [];
  return (value as AnyRecord[]).map((row, index) => {
    const title = str(pick(row, ["props_str", "title", "name", "variant", "props", "sku_name"]));
    const parsed = parseVariantTitle(title);
    return {
      id: idValue(pick(row, ["id", "variant_id", "sku_id"])) ?? index,
      product_id: idValue(pick(row, ["product_id", "variant_id", "sku_id", "id"])),
      sku: str(pick(row, ["product_sn", "sku", "sku_sn", "code"])),
      title,
      size: str(pick(row, ["size", "size_name"])) || parsed.size,
      color: str(pick(row, ["color", "color_name"])) || parsed.color,
      price: num(pick(row, ["price", "cost_price", "supply_price"])),
      retail_price: num(pick(row, ["sale_price", "my_price", "retail_price"])),
      image: normalizeUrl(str(pick(row, ["img", "icon_img", "image", "pre_img"]))),
      stock: pick(row, ["stock", "inventory", "quantity"]) === undefined
        ? undefined
        : num(pick(row, ["stock", "inventory", "quantity"])),
      shipment_id: idValue(pick(row, ["shipment_id"])),
      shipping_method: str(pick(row, ["shipping_method"])),
    };
  }).filter((v) => v.sku || v.title || v.product_id || v.id !== undefined);
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
  const rowGoods = raw.goods && typeof raw.goods === "object" ? (raw.goods as AnyRecord) : undefined;
  const source = rowGoods ? { ...rowGoods, ...raw, goods: rowGoods } : raw;
  const rawVariants = normalizeVariants(pick(raw, ["products", "variants", "skus", "sku_list", "skuList", "variations"]));
  const { sizes, colors } = extractOptions({ ...source, variants: rawVariants });
  const images = toStringList(pick(source, ["img", "images", "image_list", "imageList", "pictures", "album", "imgs", "list_img"])).map(normalizeUrl);
  for (const variant of rawVariants) {
    if (variant.image && !images.includes(variant.image)) images.push(variant.image);
  }
  const main = normalizeUrl(str(pick(source, ["pre_img", "image", "main_image", "mainImage", "cover", "thumb"]))) ||
    normalizeUrl(str(pick(rowGoods ?? {}, ["pre_img", "image", "main_image", "mainImage", "cover", "thumb"])));
  if (main && !images.includes(main)) images.unshift(main);

  const sourceKind: SupRawProduct["source"] = rowGoods
    ? Array.isArray(raw.products)
      ? "member-listed"
      : "member-queue"
    : "open-api";

  return {
    id: str(pick(source, ["goods_id", "id", "product_id", "productId", "goods_sn", "spu", "spu_id", "sku"])) || String(Date.now()),
    name: str(pick(source, ["my_title", "title", "name", "title_en", "product_name", "productName"])) || "Producto SUP",
    description: str(pick(source, ["content", "intro", "des", "description", "desc", "detail", "title_en"])),

    cost_price: num(pick(rowGoods ?? source, ["min_price", "price", "cost_price", "supply_price", "original_price"])),
    retail_price: (() => {
      const cost = num(pick(rowGoods ?? source, ["min_price", "price", "cost_price", "supply_price", "original_price"]));
      // Precio de venta definido en el listing de SUP (variantes) o en la cabecera del listing.
      const fromVariants = rawVariants.reduce((min, v) => {
        const value = num(v.retail_price);
        return value > 0 && (min === 0 || value < min) ? value : min;
      }, 0);
      const listingPrice = rowGoods ? num(pick(raw, ["min_price", "max_price"])) : 0;
      const manual = num(pick(source, ["my_price", "sale_price", "retail_price", "myprice"]));
      // `my_price` a veces queda desactualizado (igual o menor al costo): en ese
      // caso preferimos el precio real de venta del listing / variantes.
      const candidates = [fromVariants, listingPrice, manual].filter((v) => v > cost);
      return candidates.length ? Math.min(...candidates) : Math.max(manual, fromVariants, listingPrice);
    })(),


    images,
    sizes,
    colors,
    variants: rawVariants,
    categories: toStringList(pick(raw, ["categories", "category", "category_name"])),
    tags: toStringList(pick(raw, ["tags", "keywords"])),
    stock: pick(raw, ["stock", "inventory", "quantity"]) === undefined
      ? undefined
      : num(pick(raw, ["stock", "inventory", "quantity"])),
    source: sourceKind,
    storeProductId: idValue(pick(raw, ["shopify_goods_id", "shopify_product_id"])),
    storeName: str((raw.store as AnyRecord | undefined)?.name ?? raw.shop_name),
    sourceUrl: str(pick(rowGoods ?? raw, ["source_url", "link", "product_url"])),
  };
}

export function normalizeSupProducts(raws: AnyRecord[]): SupRawProduct[] {
  return raws.map(normalizeSupProduct).filter((p) => p.name);
}
