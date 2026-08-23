import { createServerFn } from '@tanstack/react-start';

export interface FulfillmentResult {
  ok: boolean;
  /** El pago entró pero el proveedor todavía no confirmó el pedido. */
  pending?: boolean;

  paid: boolean;
  supOrderId?: string;
  /** Número visible del pedido en Shopify (ej. #1001). */
  shopifyOrderNumber?: string;
  status?: string;
  tracking?: string;
  carrier?: string;
  message?: string;
}

/**
 * Cierra el circuito: pago confirmado en Stripe → pedido creado en SUP Dropshipping
 * y en Shopify → email de confirmación.
 *
 * Lógica compartida entre:
 * 1) `fulfillSupOrder` (server function): se dispara desde el navegador del
 *    cliente al llegar a la página de "gracias por tu compra".
 * 2) El webhook de Stripe (`/api/public/stripe/webhook/$environment`):
 *    se dispara desde los servidores de Stripe, SIN depender de que el
 *    cliente llegue a ver esa página. Es el respaldo real — si el cliente
 *    cierra la pestaña, pierde conexión, o la redirección falla, el pedido
 *    igual se registra en Shopify y con el proveedor.
 *
 * Es idempotente: guarda el ID del pedido de SUP en la metadata de la sesión de
 * Stripe, así no importa si se dispara dos veces (navegador + webhook), el
 * pedido no se duplica.
 */
export async function fulfillSupOrderCore(
  sessionId: string,
  environment: 'sandbox' | 'live',
): Promise<FulfillmentResult> {
  const { readOrderSnapshot, markSessionFulfilled } = await import('@/lib/stripe.server');
  const { getOrderDetail } = await import('./sup-api.server');

  let snapshot;
  try {
    snapshot = await readOrderSnapshot(sessionId, environment);
  } catch (error) {
    return { ok: false, paid: false, message: (error as Error).message };
  }

  if (!snapshot.paid) {
    return { ok: false, paid: false, message: 'El pago todavía no está confirmado.' };
  }

  const { runPostPaymentTasks } = await import('@/lib/orders/post-payment.server');

  if (snapshot.supOrderId) {
    const post = await runPostPaymentTasks({ sessionId, environment, snapshot });
    return {
      ...(await readTracking(snapshot.supOrderId, getOrderDetail)),
      paid: true,
      shopifyOrderNumber: post.shopifyOrderName || snapshot.shopifyOrderName,
    };
  }

  if (!snapshot.items.length) {
    const post = await runPostPaymentTasks({ sessionId, environment, snapshot });
    return {
      ok: true,
      paid: true,
      shopifyOrderNumber: post.shopifyOrderName || snapshot.shopifyOrderName,
      message: 'Pago confirmado. Este pedido se prepara de forma manual (no tiene productos de SUP).',
    };
  }

  const address = snapshot.address ?? {};
  const payload = {
    remark: `Youtumundial · ${sessionId}`,
    out_trade_no: sessionId,
    consignee: {
      name: snapshot.name ?? 'Cliente Youtumundial',
      phone: snapshot.phone ?? '',
      email: snapshot.email ?? '',
      country: address.country ?? '',
      province: address.state ?? '',
      city: address.city ?? '',
      address: [address.line1, address.line2].filter(Boolean).join(' '),
      zip_code: address.postal_code ?? '',
    },
    products: snapshot.items.map((item) => ({
      product_id: item.supProductId,
      variant_id: item.supVariantId,
      product_sn: item.supVariantSku,
      quantity: item.quantity,
      variant: item.variantTitle,
    })),
  };

  const finishDelayed = async (message: string): Promise<FulfillmentResult> => {
    const post = await runPostPaymentTasks({
      sessionId,
      environment,
      snapshot,
      delayed: true,
    });
    return {
      ok: true,
      paid: true,
      pending: true,
      message,
      shopifyOrderNumber: post.shopifyOrderName || snapshot.shopifyOrderName,
    };
  };

  const { createPurchaseOrderIdempotent } = await import('./sup-api.server');
  const created = await createPurchaseOrderIdempotent(sessionId, payload);
  if (!created.ok || !created.supOrderId) {
    return finishDelayed(
      'Pago confirmado. Estamos terminando de confirmar el envío con el proveedor.',
    );
  }
  await markSessionFulfilled(sessionId, environment, created.supOrderId);
  const post = await runPostPaymentTasks({
    sessionId,
    environment,
    snapshot,
  });
  return {
    ...(await readTracking(created.supOrderId, getOrderDetail)),
    paid: true,
    shopifyOrderNumber: post.shopifyOrderName || snapshot.shopifyOrderName,
  };
}

export const fulfillSupOrder = createServerFn({ method: 'POST' })
  .inputValidator((input: { sessionId: string; environment: 'sandbox' | 'live' }) => {
    const sessionId = String(input?.sessionId ?? '').trim();
    if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) throw new Error('Sesión de pago inválida');
    const environment = input?.environment === 'live' ? 'live' : 'sandbox';
    return { sessionId, environment } as const;
  })
  .handler(async ({ data }): Promise<FulfillmentResult> => {
    return fulfillSupOrderCore(data.sessionId, data.environment);
  });


async function readTracking(
  supOrderId: string,
  getOrderDetail: (id: string) => Promise<Record<string, unknown>>,
): Promise<FulfillmentResult> {
  try {
    const detail = await getOrderDetail(supOrderId);
    const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));
    return {
      ok: true,
      paid: true,
      supOrderId,
      status: str(detail.status ?? detail.order_status ?? detail.state) || undefined,
      tracking: str(detail.tracking_number ?? detail.trackingNo ?? detail.waybill ?? detail.logistics_no) || undefined,
      carrier: str(detail.shipping_method ?? detail.carrier ?? detail.logistics_name) || undefined,
    };
  } catch {
    return { ok: true, paid: true, supOrderId, status: 'procesando' };
  }
}
