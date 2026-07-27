import { createServerFn } from "@tanstack/react-start";

/** Estado de las credenciales de SUP configuradas en el proyecto. */
export const supStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supCredentialsStatus } = await import("./sup-api.server");
  return supCredentialsStatus();
});

/** Trae productos del catálogo de SUP ya normalizados para la tienda. */
export const fetchSupProducts = createServerFn({ method: "POST" })
  .inputValidator((input: { page?: number; pageSize?: number; keyword?: string; categoryId?: string }) => ({
    page: Math.max(1, Math.round(Number(input?.page) || 1)),
    pageSize: Math.min(100, Math.max(1, Math.round(Number(input?.pageSize) || 20))),
    keyword: String(input?.keyword ?? "").trim().slice(0, 200),
    categoryId: String(input?.categoryId ?? "").trim().slice(0, 100),
  }))
  .handler(async ({ data }) => {
    const { listProducts } = await import("./sup-api.server");
    const { normalizeSupProducts } = await import("./normalize");
    try {
      const raws = await listProducts({
        page: data.page,
        pageSize: data.pageSize,
        keyword: data.keyword || undefined,
        categoryId: data.categoryId || undefined,
      });
      return { ok: true as const, products: normalizeSupProducts(raws) };
    } catch (error) {
      return { ok: false as const, products: [], error: (error as Error).message };
    }
  });

/** Trae lo que ya está en tu Member Center: Imported Queue y productos Listed. */
export const fetchSupMemberProducts = createServerFn({ method: "POST" })
  .inputValidator((input: { page?: number; pageSize?: number; keyword?: string; source?: "queue" | "listed" | "all" }) => ({
    page: Math.max(1, Math.round(Number(input?.page) || 1)),
    pageSize: Math.min(100, Math.max(1, Math.round(Number(input?.pageSize) || 20))),
    keyword: String(input?.keyword ?? "").trim().slice(0, 200),
    source: input?.source === "queue" || input?.source === "listed" ? input.source : "all",
  }))
  .handler(async ({ data }) => {
    const { listMemberImportQueue, listMemberListedProducts } = await import("./sup-api.server");
    const { normalizeSupProducts } = await import("./normalize");
    try {
      const params = {
        page: data.page,
        pageSize: data.pageSize,
        keyword: data.keyword || undefined,
      };
      const [queue, listed] = await Promise.all([
        data.source === "listed" ? Promise.resolve([]) : listMemberImportQueue(params),
        data.source === "queue" ? Promise.resolve([]) : listMemberListedProducts(params),
      ]);
      return {
        ok: true as const,
        products: normalizeSupProducts([...listed, ...queue]),
        listedCount: listed.length,
        queueCount: queue.length,
      };
    } catch (error) {
      return { ok: false as const, products: [], listedCount: 0, queueCount: 0, error: (error as Error).message };
    }
  });

/** Importa desde una URL de 1688 / AliExpress / Alibaba buscando el producto en SUP. */
export const importFromSourceUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { url?: string }) => ({
    url: String(input?.url ?? "").trim().slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    if (!data.url) return { ok: false as const, products: [], error: "Pegá la URL del producto." };
    const { findBySourceUrl } = await import("./sourcing.server");
    try {
      const { parsed, matches } = await findBySourceUrl(data.url);
      if (!parsed) {
        return { ok: false as const, products: [], error: "No pude leer el ID del producto en esa URL." };
      }
      if (matches.length === 0) {
        return {
          ok: false as const,
          products: [],
          market: parsed.market,
          offerId: parsed.offerId,
          error:
            `Ese producto (${parsed.market} · ${parsed.offerId}) todavía no está en tu catálogo de SUP. ` +
            "Pegá la URL en SUP → Sourcing / Import by URL, esperá a que lo aprueben y volvé a intentar acá.",
        };
      }
      return { ok: true as const, products: matches, market: parsed.market, offerId: parsed.offerId };
    } catch (error) {
      return { ok: false as const, products: [], error: (error as Error).message };
    }
  });

/** Fuerza la resincronización del catálogo público (precio, stock, fotos, talles). */
export const resyncStoreCatalog = createServerFn({ method: "POST" }).handler(async () => {
  const { SUP_PUBLISHED_IDS } = await import("./sup-selection");
  const { syncPublishedCatalog } = await import("./catalog.server");
  try {
    const products = await syncPublishedCatalog(SUP_PUBLISHED_IDS, true);
    return { ok: true as const, count: products.length };
  } catch (error) {
    return { ok: false as const, count: 0, error: (error as Error).message };
  }
});

/** Estado de envío de un pedido: primero el webhook, si no consulta SUP. */
export const getShipmentTracking = createServerFn({ method: "POST" })
  .inputValidator((input: { supOrderId?: string }) => ({
    supOrderId: String(input?.supOrderId ?? "").trim().slice(0, 100),
  }))
  .handler(async ({ data }) => {
    if (!data.supOrderId) return { ok: false as const, error: "Falta el número de pedido." };
    const { getShipmentStatus } = await import("./shipment-store.server");
    const live = getShipmentStatus(data.supOrderId);
    if (live) return { ok: true as const, source: "webhook" as const, ...live };

    const { getOrderDetail } = await import("./sup-api.server");
    try {
      const detail = await getOrderDetail(data.supOrderId);
      const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
      return {
        ok: true as const,
        source: "api" as const,
        supOrderId: data.supOrderId,
        status: str(detail.status ?? detail.order_status ?? detail.state) || "procesando",
        tracking: str(detail.tracking_number ?? detail.logistics_no) || undefined,
        carrier: str(detail.shipping_method ?? detail.logistics_name) || undefined,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return { ok: false as const, error: (error as Error).message };
    }
  });

/** Envía un pedido de la tienda a SUP para que lo despachen. */
export const sendOrderToSup = createServerFn({ method: "POST" })
  .inputValidator((input: { order: unknown }) => ({ order: input?.order ?? null }))
  .handler(async ({ data }) => {
    if (!data.order) throw new Error("Falta el pedido a enviar.");
    const { createPurchaseOrder } = await import("./sup-api.server");
    try {
      const result = await createPurchaseOrder(data.order);
      return { ok: true as const, result: JSON.stringify(result) };
    } catch (error) {
      return { ok: false as const, error: (error as Error).message };
    }
  });

/** Diagnóstico paso a paso de la conexión con SUP (login, Listed, Imported). */
export const supHealthCheck = createServerFn({ method: "POST" }).handler(async () => {
  const { runSupHealthCheck } = await import("./health.server");
  try {
    return { ok: true as const, ...(await runSupHealthCheck()) };
  } catch (error) {
    return { ok: false as const, steps: [], totalProducts: 0, error: (error as Error).message };
  }
});
