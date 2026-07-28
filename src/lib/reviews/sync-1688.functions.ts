import { createServerFn } from "@tanstack/react-start";

/**
 * Sincroniza automáticamente todas las reseñas disponibles de un producto de 1688
 * a partir de su URL: recorre vistas y páginas hasta agotar el contenido.
 */
export const sync1688Reviews = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string; slug: string; cookie?: string; limit?: number; adminToken?: string }) => {
    const url = String(input?.url ?? "").trim();
    const slug = String(input?.slug ?? "").trim();
    if (!/^https?:\/\/.+/i.test(url)) throw new Error("Pegá una URL válida del producto en 1688.");
    if (url.length > 2000) throw new Error("La URL es demasiado larga.");
    if (!slug) throw new Error("Elegí a qué producto de la tienda pertenecen las reseñas.");
    const cookie = String(input?.cookie ?? "").trim().slice(0, 8000);
    const adminToken = String(input?.adminToken ?? '').slice(0, 200);
    const limit = Math.min(200, Math.max(1, Math.round(Number(input?.limit) || 100)));
    return { url, slug, cookie, limit, adminToken };
  })
  .handler(async ({ data }) => {
    const { assertAdmin } = await import('@/lib/admin/guard.server');
    assertAdmin(data.adminToken);
    const { syncAllReviewsFrom1688 } = await import("./scrape-1688.server");
    return syncAllReviewsFrom1688(data.url, data.slug, data.cookie, data.limit);
  });
