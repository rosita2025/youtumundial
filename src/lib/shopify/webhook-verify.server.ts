/**
 * Verificación estricta de webhooks de Shopify.
 *
 * Shopify firma el cuerpo crudo con HMAC-SHA256 usando el "webhook signing
 * secret" de la app y lo envía en base64 en `X-Shopify-Hmac-Sha256`.
 *
 * Reglas aplicadas aquí (todas obligatorias):
 *  1. Debe existir un secreto configurado en el servidor. Si falta -> 503.
 *  2. La firma HMAC debe coincidir con el cuerpo CRUDO (comparación constante).
 *  3. El header `X-Shopify-Shop-Domain` debe ser exactamente nuestra tienda.
 *  4. El topic debe estar en la lista blanca.
 *  5. `X-Shopify-Webhook-Id` se usa para descartar reenvíos duplicados.
 *  6. El API version del header debe tener formato válido.
 */

import { SHOPIFY_STORE_PERMANENT_DOMAIN } from "./storefront";

export const SHOPIFY_ALLOWED_TOPICS = [
  "orders/create",
  "orders/paid",
  "orders/updated",
  "orders/cancelled",
  "orders/fulfilled",
  "customers/create",
  "customers/update",
  "checkouts/create",
  "checkouts/update",
  "checkouts/delete",
  // Topics obligatorios de privacidad (Shopify los envía a todas las apps).
  "customers/data_request",
  "customers/redact",
  "shop/redact",
] as const;

export type ShopifyWebhookTopic = (typeof SHOPIFY_ALLOWED_TOPICS)[number];

export interface ShopifyWebhookContext {
  topic: ShopifyWebhookTopic;
  webhookId: string;
  shopDomain: string;
  apiVersion: string;
  triggeredAt: string | null;
  rawBody: string;
}

export type ShopifyWebhookVerification =
  | { ok: true; context: ShopifyWebhookContext }
  | { ok: false; status: number; reason: string };

const MAX_BODY_BYTES = 1_000_000; // 1 MB: Shopify nunca envía más que esto.

function getWebhookSecret(): string | null {
  // Preferimos un secreto dedicado; si no existe usamos el client secret de la
  // app (Shopify firma los webhooks de apps con el mismo valor).
  const secret =
    process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ||
    process.env.SHOPIFY_CLIENT_SECRET?.trim() ||
    "";
  return secret.length >= 8 ? secret : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacBase64(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const bytes = new Uint8Array(signed);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Anti-replay: recordamos los IDs de webhook ya procesados. */
const seenWebhookIds = new Map<string, number>();
const REPLAY_WINDOW_MS = 10 * 60 * 1000;

function alreadyProcessed(webhookId: string): boolean {
  const now = Date.now();
  for (const [id, at] of seenWebhookIds) {
    if (now - at > REPLAY_WINDOW_MS) seenWebhookIds.delete(id);
  }
  if (seenWebhookIds.has(webhookId)) return true;
  seenWebhookIds.set(webhookId, now);
  if (seenWebhookIds.size > 1000) {
    const oldest = [...seenWebhookIds.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldest) seenWebhookIds.delete(oldest[0]);
  }
  return false;
}

export async function verifyShopifyWebhook(
  request: Request,
): Promise<ShopifyWebhookVerification> {
  const secret = getWebhookSecret();
  if (!secret) {
    console.error("Shopify webhook: falta SHOPIFY_WEBHOOK_SECRET / SHOPIFY_CLIENT_SECRET");
    return { ok: false, status: 503, reason: "not_configured" };
  }

  if (request.method !== "POST") {
    return { ok: false, status: 405, reason: "method_not_allowed" };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { ok: false, status: 413, reason: "payload_too_large" };
  }

  const rawBody = await request.text();
  if (!rawBody || rawBody.length > MAX_BODY_BYTES) {
    return { ok: false, status: 400, reason: "invalid_body" };
  }

  const signature = request.headers.get("x-shopify-hmac-sha256")?.trim() ?? "";
  if (!signature) return { ok: false, status: 401, reason: "missing_signature" };

  const expected = await hmacBase64(secret, rawBody);
  if (!timingSafeEqual(signature, expected)) {
    return { ok: false, status: 401, reason: "invalid_signature" };
  }

  const shopDomain = (request.headers.get("x-shopify-shop-domain") ?? "").trim().toLowerCase();
  if (shopDomain !== SHOPIFY_STORE_PERMANENT_DOMAIN.toLowerCase()) {
    return { ok: false, status: 401, reason: "unexpected_shop" };
  }

  const topic = (request.headers.get("x-shopify-topic") ?? "").trim().toLowerCase();
  if (!(SHOPIFY_ALLOWED_TOPICS as readonly string[]).includes(topic)) {
    return { ok: false, status: 202, reason: "topic_ignored" };
  }

  const apiVersion = (request.headers.get("x-shopify-api-version") ?? "").trim();
  if (apiVersion && !/^\d{4}-\d{2}$|^unstable$/.test(apiVersion)) {
    return { ok: false, status: 400, reason: "invalid_api_version" };
  }

  const webhookId = (request.headers.get("x-shopify-webhook-id") ?? "").trim();
  if (!webhookId || webhookId.length > 200) {
    return { ok: false, status: 400, reason: "missing_webhook_id" };
  }
  if (alreadyProcessed(webhookId)) {
    return { ok: false, status: 200, reason: "duplicate" };
  }

  return {
    ok: true,
    context: {
      topic: topic as ShopifyWebhookTopic,
      webhookId,
      shopDomain,
      apiVersion: apiVersion || "unknown",
      triggeredAt: request.headers.get("x-shopify-triggered-at"),
      rawBody,
    },
  };
}
