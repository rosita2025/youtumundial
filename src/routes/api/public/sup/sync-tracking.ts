/**
 * Sincronización automática de tracking desde un programador externo (cron).
 *
 * URL a llamar cada 30–60 minutos:
 *   POST https://youtumundial.com/api/public/sup/sync-tracking
 *   header: x-sup-token: <SUP_WEBHOOK_SECRET>
 *
 * Refresca el estado de cada pedido en SUP, lo guarda en la sesión de Stripe
 * y envía el aviso al cliente la primera vez que aparece un tracking.
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

  // Solo por header: en la query string el secreto queda en logs y referrers.
  const token = (request.headers.get("x-sup-token") ?? "").trim();
  if (!token || !timingSafeEqual(token, secret)) return new Response("Unauthorized", { status: 401 });

  const environment = new URL(request.url).searchParams.get("env") === "sandbox" ? "sandbox" : "live";

  const { syncSupTracking } = await import("@/lib/suppliers/tracking-sync.server");
  try {
    const result = await syncSupTracking(environment);
    return Response.json({
      ok: true,
      checked: result.checked,
      updated: result.updated,
      notified: result.notified,
    });
  } catch (error) {
    console.error("sync-tracking", (error as Error).message);
    return Response.json({ ok: false, message: (error as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/sup/sync-tracking")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});
