/**
 * Selección de productos de SUP Dropshipping publicados en la tienda.
 *
 * Estos son los IDs (SPU) de SUP que se muestran en youtumundial.com.
 * La tienda consulta la Open API de SUP en vivo para cada uno, así que las
 * fotos, talles, precios y stock siempre están sincronizados con SUP.
 *
 * Nada que no esté en estas listas se publica: el importador descarta
 * cualquier producto o variante que no pertenezca al catálogo propio.
 */
import type { SupRawProduct, SupRawVariant } from "./sup";

export const SUP_PUBLISHED_IDS: string[] = [
  // Cross-border Shockproof Seamless U-neck Aerial Jumpsuit (el único importado a Shopify)
  "1132534",
];

/**
 * Allowlist opcional de SKUs propios (los de Shopify / SUP).
 * Si está vacía, se acepta cualquier SKU cuya variante pertenezca a un
 * producto de `SUP_PUBLISHED_IDS`. Si tiene valores, SOLO esos SKUs se
 * publican (comparación sin mayúsculas ni espacios).
 */
export const SUP_PUBLISHED_SKUS: string[] = [];

/**
 * Allowlist opcional de variant IDs propios. Mismo criterio que los SKUs.
 */
export const SUP_PUBLISHED_VARIANT_IDS: string[] = [];

/** Margen de venta sobre el costo de SUP (0.6 = 60%). */
export const SUP_MARGIN = 0.6;

const norm = (value: unknown) => String(value ?? "").trim().toUpperCase();

const skuAllowlist = new Set(SUP_PUBLISHED_SKUS.map(norm).filter(Boolean));
const variantAllowlist = new Set(SUP_PUBLISHED_VARIANT_IDS.map(norm).filter(Boolean));

/** ¿El ID de producto pertenece al catálogo propio? */
export function isOwnedSupProductId(id: unknown): boolean {
  if (SUP_PUBLISHED_IDS.length === 0) return false;
  return SUP_PUBLISHED_IDS.map(String).includes(String(id ?? "").trim());
}

/** ¿La variante pertenece al producto propio (por SKU / variant ID)? */
export function isOwnedSupVariant(productId: unknown, variant: SupRawVariant): boolean {
  const sku = norm(variant.sku);
  const variantId = norm(variant.id);
  const variantProductId = norm(variant.product_id);

  if (skuAllowlist.size > 0 || variantAllowlist.size > 0) {
    return (
      (sku !== "" && skuAllowlist.has(sku)) ||
      (variantId !== "" && variantAllowlist.has(variantId)) ||
      (variantProductId !== "" && variantAllowlist.has(variantProductId))
    );
  }

  // Sin allowlist explícita: la variante debe seguir colgando del producto
  // propio. Si trae un product_id de otro SPU, o un SKU que apunta a otro
  // producto (`SUP-<otro-id>-...`), se descarta.
  const pid = norm(productId);
  if (variantProductId && variantProductId !== pid) {
    // SUP a veces reutiliza product_id como sku_id del propio producto:
    // solo lo aceptamos si además ese id es un SPU publicado distinto -> fuera.
    if (isOwnedSupProductId(variant.product_id) && norm(variant.product_id) !== pid) return false;
  }
  const skuRef = sku.match(/^SUP-(\d+)-/);
  if (skuRef && skuRef[1] !== pid) return false;
  return true;
}

/**
 * Valida un producto crudo de SUP contra el catálogo propio.
 * Devuelve el producto con sus variantes filtradas, o `null` si no es nuestro.
 */
export function sanitizeOwnedSupProduct(product: SupRawProduct): SupRawProduct | null {
  if (!isOwnedSupProductId(product.id)) return null;
  if (!product.name) return null;

  const variants = (product.variants ?? []).filter((v) => isOwnedSupVariant(product.id, v));
  // Si el producto trae variantes pero ninguna es válida, no lo publicamos.
  if ((product.variants ?? []).length > 0 && variants.length === 0) return null;

  return { ...product, variants };
}

/** Filtra una lista de productos crudos dejando solo los propios. */
export function filterOwnedSupProducts(products: SupRawProduct[]): SupRawProduct[] {
  const seen = new Set<string>();
  const owned: SupRawProduct[] = [];
  for (const product of products) {
    const clean = sanitizeOwnedSupProduct(product);
    if (!clean) continue;
    const key = String(clean.id);
    if (seen.has(key)) continue;
    seen.add(key);
    owned.push(clean);
  }
  return owned;
}
