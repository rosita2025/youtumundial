/**
 * Webhook oficial de Stripe (respaldo del lado del servidor).
 *
 * Este webhook corre en los servidores de Stripe, no en el navegador del
 * cliente: cuando Stripe confirma el pago, llama a esta URL directamente,
 * sin depender de que nadie tenga una pestaña abierta. Es el respaldo real.
 *
 * URLs a configurar en el Dashboard de Stripe (una por cada modo):
 *   Modo de prueba (test mode):
 *     https://youtumundial.com/api/public/stripe/webhook/sandbox
 *   Modo real (live mode):
 *     https://youtumundial.com/api/public/stripe/webhook/live
 *
 * En cada una, escuchar el evento: checkout.session.completed
 * Guardar el "Signing secret" (whsec_...) como variable de entorno:
 *   STRIPE_WEBHOOK_SECRET_SANDBOX  (endpoint de test mode)
 *   STRIPE_WEBHOOK_SECRET_LIVE     (endpoint de live mode)
 */

import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe/webhook/$environment")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const environment = params.environment === "live" ? "live" : params.environment === "sandbox" ? "sandbox" : null;
        if (!environment) {
          return new Response("Unknown environment", { status: 404 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("Missing signature", { status: 400 });
        }

        const secretEnvKey = environment === "live" ? "STRIPE_WEBHOOK_SECRET_LIVE" : "STRIPE_WEBHOOK_SECRET_SANDBOX";
        const webhookSecret = process.env[secretEnvKey];
        if (!webhookSecret) {
          console.error(`Stripe webhook (${environment}): falta la variable ${secretEnvKey}`);
          return new Response("Not configured", { status: 500 });
        }

        const rawBody = await request.text();

        let event: Stripe.Event;
        try {
          const { createStripeClient } = await import("@/lib/stripe.server");
          const stripe = createStripeClient(environment);
          event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (error) {
          console.warn(`Stripe webhook (${environment}) firma inválida:`, (error as Error).message);
          return new Response("Invalid signature", { status: 400 });
        }

        if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
          return Response.json({ received: true });
        }

        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") {
          return Response.json({ received: true });
        }

        try {
          const { fulfillSupOrderCore } = await import("@/lib/suppliers/fulfillment.functions");
          const result = await fulfillSupOrderCore(session.id, environment);
          if (!result.ok) {
            console.error(`Stripe webhook (${environment}): fulfillment falló para ${session.id}:`, result.message);
          } else {
            console.log(`Stripe webhook (${environment}): pedido ${session.id} procesado, Shopify: ${result.shopifyOrderNumber ?? "pendiente"}`);
          }
        } catch (error) {
          console.error(`Stripe webhook (${environment}) error procesando ${session.id}:`, (error as Error).message);
          return new Response("Processing error", { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});
