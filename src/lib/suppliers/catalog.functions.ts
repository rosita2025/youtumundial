import { createServerFn } from "@tanstack/react-start";

/**
 * Catálogo público de la tienda, sincronizado en vivo con SUP Dropshipping.
 * Devuelve productos crudos de SUP normalizados; el precio de venta se calcula
 * en el cliente con `mapSupCatalog` (costo + margen).
 */
export const fetchStoreCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { SUP_PUBLISHED_IDS } = await import("./sup-selection");
  const { syncPublishedCatalog } = await import("./catalog.server");
  try {
    const products = await syncPublishedCatalog(SUP_PUBLISHED_IDS);
    return { ok: true as const, products };
  } catch (error) {
    return { ok: false as const, products: [], error: (error as Error).message };
  }
});
