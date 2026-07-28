/**
 * Webhook oficial de Shopify (pedidos, clientes y carritos abandonados).
 *
 * URL a configurar en la app de Shopify:
 *   https://youtumundial.com/api/public/shopify/webhook
 *
 * Todo evento se rechaza salvo que pase la verificación estricta de
 * `verifyShopifyWebhook` (firma HMAC del cuerpo crudo, dominio de tienda,
 * topic en lista blanca, anti-replay por webhook id).
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const attributeSchema = z.object({
  name: z.string().max(200).optional(),
  value: z.string().max(2000).nullable().optional(),
});

const payloadSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    admin_graphql_api_id: z.string().max(300).optional(),
    name: z.string().max(100).optional(),
    email: z.string().max(320).nullable().optional(),
    financial_status: z.string().max(60).nullable().optional(),
    fulfillment_status: z.string().max(60).nullable().optional(),
    cancelled_at: z.string().max(60).nullable().optional(),
    token: z.string().max(200).optional(),
    cart_token: z.string().max(200).nullable().optional(),
    note_attributes: z.array(attributeSchema).max(50).optional(),
    attributes: z.record(z.string(), z.string().nullable()).optional(),
  })
  .passthrough();

function findAbandonedReference(payload: z.infer<typeof payloadSchema>): string | null {
  const fromNotes = payload.note_attributes?.find(
    (attr) =>
      typeof attr.name === "string" &&
      ["abandoned_ref", "abandonedRef", "checkout_ref"].includes(attr.name),
  )?.value;
  if (fromNotes) return String(fromNotes).slice(0, 200);

  const fromAttributes =
    payload.attributes?.abandoned_ref ?? payload.attributes?.checkout_ref ?? null;
  if (fromAttributes) return String(fromAttributes).slice(0, 200);

  return null;
}

export const Route = createFileRoute("/api/public/shopify/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyShopifyWebhook } = await import("@/lib/shopify/webhook-verify.server");
        const verification = await verifyShopifyWebhook(request);

        if (!verification.ok) {
          // Nunca revelamos detalles internos al emisor.
          if (verification.status === 200 || verification.status === 202) {
            return Response.json({ received: true });
          }
          console.warn("Shopify webhook rechazado:", verification.reason);
          return new Response("Unauthorized", { status: verification.status });
        }

        const { topic, rawBody, webhookId } = verification.context;

        let payload: z.infer<typeof payloadSchema>;
        try {
          payload = payloadSchema.parse(JSON.parse(rawBody));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        try {
          if (topic === "orders/create" || topic === "orders/paid") {
            const reference = findAbandonedReference(payload);
            if (reference) {
              const { closeAbandonedCheckout } = await import("@/lib/shopify/abandoned.server");
              await closeAbandonedCheckout(reference);
            }
            console.log(
              `Shopify webhook ${topic}: pedido ${payload.name ?? payload.id ?? "?"} procesado (${webhookId})`,
            );
          } else if (topic === "customers/data_request" || topic === "customers/redact" || topic === "shop/redact") {
            // No almacenamos datos personales fuera de Shopify/Stripe:
            // confirmamos la recepción para cumplir con los topics obligatorios.
            console.log(`Shopify webhook de privacidad recibido: ${topic}`);
          } else {
            console.log(`Shopify webhook ${topic} recibido (${webhookId})`);
          }
        } catch (error) {
          // Registramos el detalle en el servidor, nunca en la respuesta.
          console.error(`Shopify webhook ${topic} falló:`, (error as Error).message);
          return new Response("Processing error", { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});
