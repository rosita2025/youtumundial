/**
 * Auditoría automática de conexiones (Shopify + proveedor).
 *
 *   POST https://youtumundial.com/api/public/audit/connections
 *   header: x-sup-token: <SUP_WEBHOOK_SECRET>
 *
 * Devuelve un reporte (sin secretos) confirmando que la tienda solo se conecta
 * a la tienda Shopify propia y a la cuenta de proveedor propia.
 */

import { createFileRoute } from "@tanstack/react-router";
import { auditConnections } from "@/lib/security/connection-audit";
import { SHOPIFY_STOREFRONT_URL } from "@/lib/shopify/storefront";
import { SUP_PUBLISHED_IDS } from "@/lib/suppliers/sup-selection";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function handle(request: Request) {
  const secret = process.env.SUP_WEBHOOK_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });

  const token = (request.headers.get("x-sup-token") ?? "").trim();
  if (!token || !timingSafeEqual(token, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { supCredentialsStatus } = await import("@/lib/suppliers/sup-api.server");

  let supplierBase = "";
  let credentials: Record<string, boolean> = {};
  try {
    const status = supCredentialsStatus();
    supplierBase = status.base;
    credentials = {
      hasUsername: status.hasUsername,
      hasPassword: status.hasPassword,
      hasToken: status.hasToken,
    };
  } catch (error) {
    // Host de proveedor bloqueado por la auditoría.
    supplierBase = "";
    credentials = {};
    console.error("Audit: proveedor no permitido", (error as Error).message);
  }

  const report = auditConnections({
    shopifyUrl: SHOPIFY_STOREFRONT_URL,
    supplierBase,
    supplierCredentials: credentials,
    publishedProductIds: SUP_PUBLISHED_IDS,
  });

  const { checkShopifyAdminScopes } = await import("@/lib/shopify/admin.server");
  const shopifyScopes = await checkShopifyAdminScopes();

  return Response.json(
    { ...report, shopifyAdmin: shopifyScopes },
    { status: report.ok && shopifyScopes.ok ? 200 : 409 },
  );

}

export const Route = createFileRoute("/api/public/audit/connections")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
