/**
 * Webhook público de estados de envío de SUP Dropshipping.
 *
 * URL a configurar en SUP:
 *   https://youtumundial.com/api/public/sup/shipping
 *
 * Seguridad: SUP debe firmar el cuerpo con HMAC-SHA256 usando el secreto
 * compartido `SUP_WEBHOOK_SECRET` y enviarlo en `x-sup-signature`
 * (hex o base64). Si SUP no soporta firma, acepta también el mismo secreto
 * en el header `x-sup-token`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  order_id: z.union([z.string(), z.number()]).optional(),
  order_sn: z.union([z.string(), z.number()]).optional(),
  out_trade_no: z.string().max(200).optional(),
  status: z.string().max(100).optional(),
  order_status: z.string().max(100).optional(),
  tracking_number: z.string().max(200).optional(),
  logistics_no: z.string().max(200).optional(),
  carrier: z.string().max(200).optional(),
  logistics_name: z.string().max(200).optional(),
  shipping_method: z.string().max(200).optional(),
  tracking_url: z.string().url().max(500).optional(),
});

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const bytes = new Uint8Array(signed);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  const base64 = btoa(String.fromCharCode(...bytes));
  return { hex, base64 };
}

export const Route = createFileRoute("/api/public/sup/shipping")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.SUP_WEBHOOK_SECRET;
        if (!secret) {
          console.error("SUP webhook: falta SUP_WEBHOOK_SECRET");
          return new Response("Not configured", { status: 503 });
        }

        const body = await request.text();
        const signature = request.headers.get("x-sup-signature");
        const token = request.headers.get("x-sup-token");

        let authorized = false;
        if (signature) {
          const { hex, base64 } = await hmacHex(secret, body);
          authorized = timingSafeEqual(signature.trim(), hex) || timingSafeEqual(signature.trim(), base64);
        } else if (token) {
          authorized = timingSafeEqual(token.trim(), secret);
        }
        if (!authorized) return new Response("Invalid signature", { status: 401 });

        let parsed: z.infer<typeof payloadSchema>;
        try {
          parsed = payloadSchema.parse(JSON.parse(body));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const supOrderId = String(parsed.order_id ?? parsed.order_sn ?? parsed.out_trade_no ?? "");
        if (!supOrderId) return new Response("Missing order id", { status: 400 });

        const { putShipmentStatus } = await import("@/lib/suppliers/shipment-store.server");
        putShipmentStatus({
          supOrderId,
          status: parsed.status ?? parsed.order_status ?? "updated",
          tracking: parsed.tracking_number ?? parsed.logistics_no,
          carrier: parsed.carrier ?? parsed.logistics_name ?? parsed.shipping_method,
          trackingUrl: parsed.tracking_url,
          updatedAt: new Date().toISOString(),
        });

        return Response.json({ received: true });
      },
    },
  },
});
