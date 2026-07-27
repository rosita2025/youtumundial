/**
 * Sincronización del catálogo público con SUP Dropshipping (solo servidor).
 *
 * Funciona como el plugin de SUP para Shopify: para cada producto publicado
 * consulta el detalle real en SUP (imágenes, talles/colores, precio de costo
 * y stock) y lo normaliza al formato de la tienda. Se cachea en memoria unos
 * minutos para no golpear la API en cada visita.
 */

import { getProductDetail, getProductVariants, listProducts } from "./sup-api.server";
import { normalizeSupProduct, normalizeSupProducts } from "./normalize";
import type { SupRawProduct } from "./sup";

const TTL_MS = 10 * 60 * 1000;

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
    return raw.name ? raw : null;
  } catch {
    return null;
  }
}

/** Trae los productos publicados desde SUP, ya normalizados. */
export async function syncPublishedCatalog(ids: string[], force = false): Promise<SupRawProduct[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.products;

  let products: SupRawProduct[] = [];

  if (ids.length > 0) {
    const settled = await Promise.all(ids.map((id) => fetchOne(String(id))));
    products = settled.filter((p): p is SupRawProduct => p !== null);
  } else {
    // Sin selección todavía: mostramos las primeras novedades del catálogo de SUP
    // para que la tienda nunca quede vacía.
    try {
      products = normalizeSupProducts(await listProducts({ page: 1, pageSize: 24 }));
    } catch {
      products = [];
    }
  }

  cache = { at: Date.now(), products };
  return products;
}
