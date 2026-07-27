/**
 * Importación de productos a partir de una URL de 1688 / AliExpress / Alibaba
 * y utilidades de sincronización con SUP Dropshipping (solo servidor).
 *
 * La Open API de SUP no expone un endpoint de "importar por URL" (eso vive en
 * el Member Center → Sourcing). Lo que hacemos acá es extraer el ID de oferta
 * de la URL y buscarlo dentro del catálogo de SUP: si ya lo sourcearon,
 * aparece y se publica en la tienda con un clic.
 */

import {
  listMemberImportQueue,
  listMemberListedProducts,
  listProducts,
  getProductDetail,
  getProductVariants,
} from "./sup-api.server";
import { normalizeSupProduct, normalizeSupProducts } from "./normalize";
import type { SupRawProduct } from "./sup";

export type SourceMarket = "1688" | "aliexpress" | "alibaba" | "taobao" | "desconocido";

export interface ParsedSourceUrl {
  market: SourceMarket;
  offerId: string;
}

/** Detecta el marketplace y el ID de oferta dentro de la URL pegada. */
export function parseSourceUrl(input: string): ParsedSourceUrl | null {
  const raw = input.trim();
  if (!raw) return null;

  let host = "";
  let path = raw;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    host = url.hostname.toLowerCase();
    path = `${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    host = "";
  }

  const market: SourceMarket = host.includes("1688")
    ? "1688"
    : host.includes("aliexpress")
      ? "aliexpress"
      : host.includes("alibaba")
        ? "alibaba"
        : host.includes("taobao") || host.includes("tmall")
          ? "taobao"
          : "desconocido";

  const candidates = [
    /offer\/(\d{6,})/i,
    /item\/(?:[a-z-]+\/)?(\d{6,})/i,
    /product-detail\/[^/]*?(\d{8,})/i,
    /[?&](?:id|offerId|productId|product_id)=(\d{6,})/i,
    /(\d{9,})/,
  ];
  for (const re of candidates) {
    const match = path.match(re) ?? raw.match(re);
    if (match?.[1]) return { market, offerId: match[1] };
  }
  return null;
}

async function withDetail(id: string): Promise<SupRawProduct | null> {
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

/**
 * Busca en SUP el producto correspondiente a una URL de 1688/AliExpress/Alibaba.
 * Devuelve coincidencias con imágenes, talles y precio de costo reales.
 */
export async function findBySourceUrl(url: string): Promise<{
  parsed: ParsedSourceUrl | null;
  matches: SupRawProduct[];
}> {
  const parsed = parseSourceUrl(url);
  if (!parsed) return { parsed: null, matches: [] };

  // 1) El ID de oferta puede ser el propio ID de producto en SUP.
  const direct = await withDetail(parsed.offerId);
  if (direct) return { parsed, matches: [direct] };

  // 2) Si no, lo buscamos como término (SUP indexa SKU y código de origen).
  try {
    const [listed, queue] = await Promise.all([
      listMemberListedProducts({ page: 1, pageSize: 50, keyword: parsed.offerId }),
      listMemberImportQueue({ page: 1, pageSize: 50, keyword: parsed.offerId }),
    ]);
    const memberMatches = normalizeSupProducts([...listed, ...queue]);
    if (memberMatches.length) return { parsed, matches: memberMatches };
  } catch {
    // Seguimos con la Open API pública.
  }

  // 3) Si no, buscamos en la Open API pública.
  try {
    const rows = await listProducts({ page: 1, pageSize: 20, keyword: parsed.offerId });
    return { parsed, matches: normalizeSupProducts(rows) };
  } catch {
    return { parsed, matches: [] };
  }
}

/** Trae el stock y precio actual de un producto de SUP (para refrescar la tienda). */
export async function refreshProduct(id: string) {
  return withDetail(id);
}
