/**
 * Sincronización automática del catálogo desde el Member Center de SUP.
 *
 * URL a llamar cada 1–6 horas desde un programador externo (cron):
 *   POST https://youtumundial.com/api/public/sup/sync-catalog
 *   header: x-sup-token: <SUP_WEBHOOK_SECRET>
 *
 * Refresca en el servidor los productos importados/listados en SUP
 * (1688, AliExpress, Alibaba…) con sus imágenes, talles, precio y stock,
 * sin que nadie tenga que entrar a /admin/sup.
 */

import { createFileRoute } from "@tanstack/react-router";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function handle(request: Request) {
  const secret = process.env.SUP_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });

  const token = (
    request.headers.get("x-sup-token") ??
    new URL(request.url).searchParams.get("token") ??
    ""
  ).trim();
  if (!token || !timingSafeEqual(token, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { syncPublishedCatalog } = await import("@/lib/suppliers/catalog.server");
    const { SUP_PUBLISHED_IDS } = await import("@/lib/suppliers/sup-selection");

    const products = await syncPublishedCatalog(SUP_PUBLISHED_IDS, true);

    return Response.json({
      ok: true,
      syncedAt: new Date().toISOString(),
      count: products.length,
      products: products.slice(0, 50).map((p) => ({
        id: p.id,
        name: p.name,
        source: p.source ?? null,
        images: p.images?.length ?? 0,
        variants: p.variants?.length ?? 0,
      })),
    });
  } catch (error) {
    console.error("sync-catalog", (error as Error).message);
    return Response.json({ ok: false, message: (error as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/sup/sync-catalog")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});
