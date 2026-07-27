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

/** Envía un pedido de la tienda a SUP para que lo despachen. */
export const sendOrderToSup = createServerFn({ method: "POST" })
  .inputValidator((input: { order: unknown }) => ({ order: input?.order ?? null }))
  .handler(async ({ data }) => {
    if (!data.order) throw new Error("Falta el pedido a enviar.");
    const { createPurchaseOrder } = await import("./sup-api.server");
    try {
      return { ok: true as const, result: await createPurchaseOrder(data.order) };
    } catch (error) {
      return { ok: false as const, error: (error as Error).message };
    }
  });
