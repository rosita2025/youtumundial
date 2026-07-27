/**
 * Listado de pedidos del admin (sin base de datos).
 *
 * La fuente de verdad es Stripe: cada compra pagada es una Checkout Session.
 * El ID del pedido de SUP queda guardado en la metadata de esa sesión
 * (`sup_order_id`), así que con Stripe + SUP alcanza para ver todo el circuito:
 * cobro → pedido en SUP → pago al proveedor → tracking.
 */
import { type StripeEnv, createStripeClient } from '@/lib/stripe.server';

export interface AdminOrderLine {
  supProductId: string;
  quantity: number;
  variantTitle: string;
}

export interface AdminOrder {
  sessionId: string;
  createdAt: string;
  customer: string;
  email: string;
  country: string;
  address: string;
  phone: string;
  /** Lo que te pagó el cliente (tu ingreso bruto). */
  amountPaid: number;
  currency: string;
  items: AdminOrderLine[];
  supOrderId?: string;
  /** Estado del pedido dentro de SUP. */
  supStatus?: string;
  /** Costo a pagar en la wallet de SUP (producto + envío internacional). */
  supCost?: number;
  supShippingCost?: number;
  supPaid?: boolean;
  tracking?: string;
  carrier?: string;
  trackingUrl?: string;
  /** Cuándo SUP despachó y cuándo se avisó al cliente. */
  shippedAt?: string;
  notifiedAt?: string;
  notifyPending?: string;
  lastSyncAt?: string;
  /** Qué te toca hacer a vos ahora mismo. */
  action: 'pagar_en_sup' | 'crear_pedido_sup' | 'en_transito' | 'enviado' | 'manual';
}


const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

/** Interpreta el estado que devuelve SUP para saber si ya está pagado al proveedor. */
function readSupState(detail: Record<string, unknown>) {
  const status = str(detail.status ?? detail.order_status ?? detail.state).toLowerCase();
  const paidFlag = detail.pay_status ?? detail.paid ?? detail.is_paid;
  const supPaid =
    paidFlag === true ||
    paidFlag === 1 ||
    str(paidFlag) === '1' ||
    /paid|payed|processing|shipped|delivered|completed|fulfilled/.test(status);

  return {
    supStatus: status || undefined,
    supPaid,
    supCost: num(detail.total_amount ?? detail.amount ?? detail.total ?? detail.pay_amount),
    supShippingCost: num(detail.shipping_fee ?? detail.freight ?? detail.shipping_amount),
    tracking: str(detail.tracking_number ?? detail.trackingNo ?? detail.waybill ?? detail.logistics_no) || undefined,
    carrier: str(detail.shipping_method ?? detail.carrier ?? detail.logistics_name) || undefined,
  };
}

export async function listAdminOrders(env: StripeEnv, limit = 25): Promise<AdminOrder[]> {
  const stripeOrders = await listStripeOrders(env, limit);
  const supOnly = await listSupOnlyOrders(stripeOrders);
  return [...supOnly, ...stripeOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Pedidos creados directo en SUP (cupón 100%, Yape/Plin, PayPal manual):
 * no existen en Stripe, así que los leemos de la cuenta de SUP.
 */
async function listSupOnlyOrders(stripeOrders: AdminOrder[]): Promise<AdminOrder[]> {
  try {
    const { listSupOrders } = await import('@/lib/suppliers/sup-api.server');
    const known = new Set(stripeOrders.map((o) => o.supOrderId).filter(Boolean) as string[]);
    const rows = (await listSupOrders({ limit: 50 })) as Record<string, unknown>[];

    return rows
      .map((row) => {
        const supOrderId = str(row.order_id ?? row.id ?? row.order_sn ?? row.order_no);
        if (!supOrderId || known.has(supOrderId)) return null;
        const consignee = (row.consignee ?? row.address ?? {}) as Record<string, unknown>;
        const state = readSupState(row);
        const createdAt = str(row.created_at ?? row.create_time ?? row.created ?? '');
        const products = Array.isArray(row.products) ? (row.products as Record<string, unknown>[]) : [];

        const order: AdminOrder = {
          sessionId: `sup_${supOrderId}`,
          createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
          customer: str(consignee.name) || 'Cliente',
          email: str(consignee.email),
          country: str(consignee.country),
          address: [consignee.address, consignee.city, consignee.province, consignee.zip_code]
            .map(str)
            .filter(Boolean)
            .join(', '),
          phone: str(consignee.phone),
          amountPaid: 0,
          currency: 'USD',
          items: products.map((p) => ({
            supProductId: str(p.product_id ?? p.id),
            quantity: Number(p.quantity) || 1,
            variantTitle: str(p.variant ?? p.variant_name ?? ''),
          })),
          supOrderId,
          ...state,
          action: state.tracking ? 'enviado' : state.supPaid ? 'en_transito' : 'pagar_en_sup',
        };
        return order;
      })
      .filter((o): o is AdminOrder => o !== null);
  } catch {
    return [];
  }
}

async function listStripeOrders(env: StripeEnv, limit: number): Promise<AdminOrder[]> {
  const stripe = createStripeClient(env);
  const { getOrderDetail } = await import('@/lib/suppliers/sup-api.server');

  const sessions = await stripe.checkout.sessions.list({
    limit: Math.min(Math.max(limit, 1), 100),
  });

  const paid = sessions.data.filter((s) => s.payment_status === 'paid');

  return Promise.all(
    paid.map(async (session): Promise<AdminOrder> => {
      const metadata = (session.metadata ?? {}) as Record<string, string>;

      let json = '';
      for (let i = 0; i < 10; i++) json += metadata[`sup_items_${i}`] ?? '';
      let items: AdminOrderLine[] = [];
      if (json) {
        try {
          items = (JSON.parse(json) as { p: string; q: number; v: string }[]).map((i) => ({
            supProductId: String(i.p),
            quantity: Number(i.q) || 1,
            variantTitle: String(i.v ?? ''),
          }));
        } catch {
          items = [];
        }
      }

      const shipping =
        (session as unknown as {
          collected_information?: { shipping_details?: { name?: string; address?: Record<string, string> } };
          shipping_details?: { name?: string; address?: Record<string, string> };
        }).collected_information?.shipping_details ??
        (session as unknown as { shipping_details?: { name?: string; address?: Record<string, string> } })
          .shipping_details;

      const address = (shipping?.address ?? session.customer_details?.address ?? {}) as Record<string, string>;
      const supOrderId = metadata.sup_order_id || undefined;

      let supState: ReturnType<typeof readSupState> = {
        supStatus: undefined,
        supPaid: false,
        supCost: undefined,
        supShippingCost: undefined,
        tracking: undefined,
        carrier: undefined,
      };

      if (supOrderId) {
        try {
          supState = readSupState(await getOrderDetail(supOrderId));
        } catch {
          // Sin respuesta en vivo usamos lo último sincronizado/recibido por webhook.
          supState = {
            ...supState,
            supStatus: metadata.sup_status || 'sin respuesta de SUP',
            tracking: metadata.sup_tracking || undefined,
            carrier: metadata.sup_carrier || undefined,
          };
        }
      }

      // La metadata guarda el último tracking sincronizado: nunca lo perdemos.
      const tracking = supState.tracking ?? metadata.sup_tracking ?? undefined;
      const carrier = supState.carrier ?? metadata.sup_carrier ?? undefined;
      const shippedAt = metadata.sup_shipped_at || undefined;

      const action: AdminOrder['action'] = !items.length
        ? 'manual'
        : !supOrderId
          ? 'crear_pedido_sup'
          : tracking || shippedAt
            ? 'enviado'
            : supState.supPaid
              ? 'en_transito'
              : 'pagar_en_sup';

      return {
        sessionId: session.id,
        createdAt: new Date((session.created ?? 0) * 1000).toISOString(),
        customer: shipping?.name ?? session.customer_details?.name ?? 'Cliente',
        email: session.customer_details?.email ?? '',
        country: address.country ?? '',
        address: [address.line1, address.line2, address.city, address.state, address.postal_code]
          .filter(Boolean)
          .join(', '),
        phone: session.customer_details?.phone ?? '',
        amountPaid: (session.amount_total ?? 0) / 100,
        currency: (session.currency ?? 'usd').toUpperCase(),
        items,
        supOrderId,
        ...supState,
        tracking,
        carrier,
        trackingUrl: metadata.sup_tracking_url || undefined,
        shippedAt,
        notifiedAt: metadata.sup_notified_at || undefined,
        notifyPending: metadata.sup_notify_error || undefined,
        lastSyncAt: metadata.sup_synced_at || undefined,
        action,
      };

    }),
  );
}
