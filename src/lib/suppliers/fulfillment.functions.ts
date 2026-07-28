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
 * Cierra el circuito: pago confirmado en Stripe → pedido creado en SUP Dropshipping.
 * Es idempotente: guarda el ID del pedido de SUP en la metadata de la sesión de Stripe,
 * así una recarga de la página no duplica el pedido.
 */
export const fulfillSupOrder = createServerFn({ method: 'POST' })
  .inputValidator((input: { sessionId: string; environment: 'sandbox' | 'live' }) => {
    const sessionId = String(input?.sessionId ?? '').trim();
    if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) throw new Error('Sesión de pago inválida');
    const environment = input?.environment === 'live' ? 'live' : 'sandbox';
    return { sessionId, environment } as const;
  })
  .handler(async ({ data }): Promise<FulfillmentResult> => {
    const { readOrderSnapshot, markSessionFulfilled } = await import('@/lib/stripe.server');
    const { createPurchaseOrder, getOrderDetail } = await import('./sup-api.server');

    let snapshot;
    try {
      snapshot = await readOrderSnapshot(data.sessionId, data.environment);
    } catch (error) {
      return { ok: false, paid: false, message: (error as Error).message };
    }

    if (!snapshot.paid) {
      return { ok: false, paid: false, message: 'El pago todavía no está confirmado.' };
    }

    const { runPostPaymentTasks } = await import('@/lib/orders/post-payment.server');

    // Ya despachado: solo leemos estado y tracking.
    if (snapshot.supOrderId) {
      const post = await runPostPaymentTasks({ sessionId: data.sessionId, environment: data.environment, snapshot });
      return {
        ...(await readTracking(snapshot.supOrderId, getOrderDetail)),
        paid: true,
        shopifyOrderNumber: post.shopifyOrderName,
      };
    }

    if (!snapshot.items.length) {
      const post = await runPostPaymentTasks({ sessionId: data.sessionId, environment: data.environment, snapshot });
      return {
        ok: true,
        paid: true,
        shopifyOrderNumber: post.shopifyOrderName,
        message: 'Pago confirmado. Este pedido se prepara de forma manual (no tiene productos de SUP).',
      };
    }

    const address = snapshot.address ?? {};
    const payload = {
      remark: `Youtumundial · ${data.sessionId}`,
      out_trade_no: data.sessionId,
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

    // El pago ya se cobró: pase lo que pase con el proveedor, el pedido se
    // registra en Shopify y el cliente recibe un email.
    const finishDelayed = async (message: string): Promise<FulfillmentResult> => {
      const post = await runPostPaymentTasks({
        sessionId: data.sessionId,
        environment: data.environment,
        snapshot,
        delayed: true,
      });
      return { ok: true, paid: true, pending: true, message, shopifyOrderNumber: post.shopifyOrderName };
    };

    try {
      const result = (await createPurchaseOrder(payload)) as Record<string, unknown>;
      const body = (result.data ?? result) as Record<string, unknown>;
      const supOrderId = String(
        body.order_id ?? body.id ?? body.order_sn ?? body.order_no ?? '',
      );
      if (!supOrderId) {
        console.warn('fulfillSupOrder: SUP sin order_id', data.sessionId);
        return finishDelayed('Pago confirmado. Estamos terminando de confirmar el envío con el proveedor.');
      }
      await markSessionFulfilled(data.sessionId, data.environment, supOrderId);
      const post = await runPostPaymentTasks({ sessionId: data.sessionId, environment: data.environment, snapshot });
      return {
        ...(await readTracking(supOrderId, getOrderDetail)),
        paid: true,
        shopifyOrderNumber: post.shopifyOrderName,
      };
    } catch (error) {
      // El detalle crudo del proveedor queda solo en los logs del servidor.
      console.error('fulfillSupOrder', data.sessionId, (error as Error).message);
      return finishDelayed('Pago confirmado. Estamos terminando de confirmar el envío con el proveedor.');
    }
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
