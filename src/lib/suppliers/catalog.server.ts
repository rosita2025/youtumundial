/**
 * Sincronización del catálogo público con SUP Dropshipping (solo servidor).
 *
 * Funciona como el plugin de SUP para Shopify: para cada producto publicado
 * consulta el detalle real en SUP (imágenes, talles/colores, precio de costo
 * y stock) y lo normaliza al formato de la tienda. Se cachea en memoria unos
 * minutos para no golpear la API en cada visita.
 */

import {
  getProductDetail,
  getProductVariants,
  listMemberImportQueue,
  listMemberListedProducts,
} from "./sup-api.server";
import { normalizeSupProduct, normalizeSupProducts } from "./normalize";
import { filterOwnedSupProducts, isOwnedSupProductId, sanitizeOwnedSupProduct } from "./sup-selection";
import type { SupRawProduct } from "./sup";

const TTL_MS = 3 * 60 * 1000;

let cache: { at: number; products: SupRawProduct[] } | null = null;

async function fetchOne(id: string): Promise<SupRawProduct | null> {
  try {
    const detail = await getProductDetail(id);
    let variants: unknown[] = [];
    try {
      variants = await getProductVariants(id);
    } catch {
      variants = [];
    }
    const raw = normalizeSupProduct({
      ...detail,
      id: (detail as Record<string, unknown>).id ?? id,
      variants: variants.length ? variants : (detail as Record<string, unknown>).variants,
    });
    return sanitizeOwnedSupProduct(raw);
  } catch {
    return null;
  }
}

/** Trae los productos publicados desde SUP, ya normalizados. */
export async function syncPublishedCatalog(ids: string[], force = false): Promise<SupRawProduct[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.products;

  // Siempre partimos del Member Center real de la cuenta (productos importados
  // o listados desde 1688, AliExpress, Alibaba…).
  let products: SupRawProduct[] = [];
  try {
    // Secuencial a propósito: SUP invalida el token si pedimos dos logins a la vez.
    const listed = await listMemberListedProducts({ page: 1, pageSize: 200 });
    const queue = await listMemberImportQueue({ page: 1, pageSize: 200 });
    const seen = new Set<string>();
    const merged = [...listed, ...queue].filter((row) => {
      const key = String(
        (row as Record<string, unknown>).goods_id ??
          (row as Record<string, unknown>).product_id ??
          (row as Record<string, unknown>).id ??
          "",
      );
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    products = normalizeSupProducts(merged);
  } catch {
    products = [];
  }

  // Validación estricta: solo IDs/SKUs/variantes que pertenecen al catálogo propio.
  const wanted = ids.map(String).filter((id) => isOwnedSupProductId(id));
  let owned = filterOwnedSupProducts(products).filter((p) => wanted.includes(String(p.id)));

  const missing = wanted.filter((id) => !owned.some((p) => String(p.id) === id));
  if (missing.length > 0) {
    const extra = await Promise.all(missing.map((id) => fetchOne(id)));
    owned = owned.concat(extra.filter((p): p is SupRawProduct => p !== null));
  }

  products = owned;

  cache = { at: Date.now(), products };
  return products;
}

