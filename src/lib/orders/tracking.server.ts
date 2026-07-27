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
  status: 'No encontramos ese pedido',
  statusStep: 'recibido',
  items: [],
};

/** Traduce el estado de SUP a algo entendible para el cliente. */
function readStatus(detail: Record<string, unknown>, tracking: string, shippedAt: string) {
  const raw = str(detail.statusInfo).toLowerCase();
  if (/complete|finish|deliver/.test(raw)) {
    return { status: 'Entregado', step: 'entregado' as const };
  }
  if (tracking || shippedAt || /shipp|transit|sent/.test(raw)) {
    return { status: 'Enviado · en camino', step: 'enviado' as const };
  }
  if (/process|paid|purchas|prepar/.test(raw)) {
    return { status: 'Preparando tu envío', step: 'preparando' as const };
  }
  return { status: 'Pedido recibido', step: 'recibido' as const };
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
  if (!ref) return { ...EMPTY, message: 'Escribí el número de tu pedido.' };

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
              status: 'Pedido recibido',
              statusStep: 'recibido',
              items: [],
              message: 'Tu pago está confirmado. En cuanto salga del almacén verás acá el tracking.',
            };
          }
        } catch {
          /* probamos el otro entorno */
        }
      }
      if (!supOrderId) {
        return { ...EMPTY, message: 'No encontramos ese número de pago.' };
      }
    } else {
      const rows = (await listSupOrders({ limit: 100 })) as Record<string, unknown>[];
      const match = rows.find(
        (row) =>
          str(row.order_sn).toLowerCase() === ref.toLowerCase() ||
          str(row.id) === ref ||
          str(row.out_trade_no).toLowerCase() === ref.toLowerCase(),
      );
      if (!match) {
        return { ...EMPTY, message: 'No encontramos un pedido con ese número.' };
      }
      supOrderId = str(match.id ?? match.order_sn);
    }

    return toPublic(await getOrderDetail(supOrderId));
  } catch (error) {
    return { ...EMPTY, message: (error as Error).message };
  }
}
