/**
 * Consulta pública de estado y seguimiento de un pedido.
 * Solo devuelve información no sensible (estado, tracking, fechas).
 */
import { getOrderDetail, listSupOrders } from '@/lib/suppliers/sup-api.server';

export interface PublicTracking {
  found: boolean;
  reference?: string;
  status: string;
  statusStep: 'recibido' | 'preparando' | 'enviado' | 'entregado';
  placedAt?: string;
  shippedAt?: string;
  tracking?: string;
  trackingUrl?: string;
  items: { title: string; quantity: number }[];
  message?: string;
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v));

const EMPTY: PublicTracking = {
  found: false,
  status: 'Order not found',
  statusStep: 'recibido',
  items: [],
};

/** Traduce el estado de SUP a algo entendible para el cliente. */
function readStatus(detail: Record<string, unknown>, tracking: string, shippedAt: string) {
  const raw = str(detail.statusInfo).toLowerCase();
  if (/complete|finish|deliver/.test(raw)) {
    return { status: 'Delivered', step: 'entregado' as const };
  }
  if (tracking || shippedAt || /shipp|transit|sent/.test(raw)) {
    return { status: 'Shipped · On the way', step: 'enviado' as const };
  }
  if (/process|paid|purchas|prepar/.test(raw)) {
    return { status: 'Preparing shipment', step: 'preparando' as const };
  }
  return { status: 'Order received', step: 'recibido' as const };
}

function toPublic(detail: Record<string, unknown>): PublicTracking {
  const goods = Array.isArray(detail.order_goods_list)
    ? (detail.order_goods_list as Record<string, unknown>[])
    : [];

  const tracking =
    str(detail.tracking_number) || str(goods.find((g) => str(g.tracking_number))?.tracking_number);
  const trackingUrl = str(goods.find((g) => str(g.tracking_url))?.tracking_url);
  const shippedAt = str(detail.shipment_at ?? detail.shipment_depart_at);
  const { status, step } = readStatus(detail, tracking, shippedAt);

  return {
    found: true,
    reference: str(detail.order_sn ?? detail.id),
    status,
    statusStep: step,
    placedAt: str(detail.created_at) || undefined,
    shippedAt: shippedAt || undefined,
    tracking: tracking || undefined,
    trackingUrl:
      trackingUrl ||
      (tracking ? `https://t.17track.net/en#nums=${encodeURIComponent(tracking)}` : undefined),
    items: goods.map((g) => ({
      title: str(g.goods_name),
      quantity: Number(g.quantity) || 1,
    })),
  };
}

/** Busca el pedido por número de SUP, o por el ID de la sesión de pago de Stripe. */
export async function trackPublicOrder(reference: string): Promise<PublicTracking> {
  const ref = reference.trim();
  if (!ref) return { ...EMPTY, message: 'Please enter your order number.' };

  try {
    let supOrderId = '';

    if (/^cs_[a-zA-Z0-9_]+$/.test(ref)) {
      const { readOrderSnapshot } = await import('@/lib/stripe.server');
      for (const env of ['live', 'sandbox'] as const) {
        try {
          const snapshot = await readOrderSnapshot(ref, env);
          if (snapshot.supOrderId) {
            supOrderId = snapshot.supOrderId;
            break;
          }
          if (snapshot.paid) {
            return {
              found: true,
              reference: ref,
              status: 'Order received',
              statusStep: 'recibido',
              items: [],
              message: 'Your payment is confirmed. Tracking will appear here once it leaves the warehouse.',
            };
          }
        } catch {
          /* probamos el otro entorno */
        }
      }
      if (!supOrderId) {
        return { ...EMPTY, message: 'Payment reference not found.' };
      }
    } else {
      // Solo aceptamos la referencia completa del pedido: los IDs internos
      // son secuenciales y permitirían adivinar pedidos ajenos.
      if (ref.length < 8) {
        return { ...EMPTY, message: 'Please enter the full order number.' };
      }
      const rows = (await listSupOrders({ limit: 100 })) as Record<string, unknown>[];
      const match = rows.find(
        (row) =>
          str(row.order_sn).toLowerCase() === ref.toLowerCase() ||
          str(row.out_trade_no).toLowerCase() === ref.toLowerCase(),
      );
      if (!match) {
        return { ...EMPTY, message: 'Order not found.' };
      }
      supOrderId = str(match.id ?? match.order_sn);
    }

    return toPublic(await getOrderDetail(supOrderId));
  } catch (error) {
    // El detalle real (credenciales, endpoints de SUP) queda solo en el log.
    console.error('trackPublicOrder', (error as Error).message);
    return { ...EMPTY, message: 'Could not retrieve your order at this time. Please try again in a few minutes.' };
  }

}
