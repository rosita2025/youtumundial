/**
 * Tareas automáticas después de un pago confirmado en Stripe.
 *
 * 1. Registra el pedido en Shopify (inventario y reportes de la tienda).
 * 2. Manda el email de confirmación al cliente.
 * 3. Si el proveedor no aceptó el pedido, manda el email de "en proceso".
 *
 * Todo es idempotente: las marcas se guardan en la metadata de la sesión de
 * Stripe, así una recarga de la página no duplica pedidos ni emails.
 * Ninguna de estas tareas puede romper la compra: los errores solo se loguean.
 */

import type { StripeOrderSnapshot } from '@/lib/stripe.server';

export async function runPostPaymentTasks(params: {
  sessionId: string;
  environment: 'sandbox' | 'live';
  snapshot: StripeOrderSnapshot;
  /** true cuando SUP no confirmó el pedido y queda pendiente. */
  delayed?: boolean;
}): Promise<{ shopifyOrderName?: string }> {
  const { snapshot, sessionId, environment } = params;
  const { markSessionMeta } = await import('@/lib/stripe.server');
  const patch: Record<string, string> = {};
  let shopifyOrderName = snapshot.shopifyOrderName;

  // 1) Pedido en Shopify (una sola vez).
  if (!snapshot.shopifyOrderId && snapshot.items.length) {
    const { createShopifyOrder } = await import('@/lib/shopify/admin.server');
    const totalQty = snapshot.items.reduce((sum, i) => sum + i.quantity, 0) || 1;
    // El snapshot no guarda el precio por línea: repartimos el total cobrado.
    const unit = snapshot.amountTotal / totalQty;
    const result = await createShopifyOrder({
      reference: sessionId,
      email: snapshot.email,
      name: snapshot.name,
      phone: snapshot.phone,
      currency: snapshot.currency,
      address: snapshot.address,
      lines: snapshot.items.map((item) => ({
        title: item.variantTitle || 'Producto Youtumundial',
        quantity: item.quantity,
        price: unit,
        sku: item.supVariantSku,
      })),
    });
    if (result.ok && result.orderId) {
      patch.shopify_order_id = result.orderId;
      if (result.orderName) {
        patch.shopify_order_name = result.orderName;
        shopifyOrderName = result.orderName;
      }
    }
  }

  // 2) Email al cliente (confirmación o aviso de demora), una sola vez.
  if (!snapshot.confirmationSent && snapshot.email) {
    const { notifyOrderConfirmed, notifyOrderDelayed } = await import(
      '@/lib/notifications/order-notify.server'
    );
    const input = {
      email: snapshot.email,
      customer: snapshot.name,
      reference: sessionId,
      total: snapshot.amountTotal,
      currency: snapshot.currency,
      lines: snapshot.items.map((i) => ({ title: i.variantTitle, quantity: i.quantity })),
    };
    const sendResult = params.delayed
      ? await notifyOrderDelayed(input)
      : await notifyOrderConfirmed(input);
    if (sendResult.sent) patch.confirmation_sent = '1';
    else console.warn('post-payment email', sessionId, sendResult.message);
  }

  if (params.delayed) patch.sup_pending = '1';
  if (Object.keys(patch).length) await markSessionMeta(sessionId, environment, patch);

  return { shopifyOrderName };
}
