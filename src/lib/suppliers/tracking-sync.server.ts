/**
 * Sincronización automática de estado y tracking desde SUP Dropshipping.
 *
 * Fuente de verdad del pedido: la sesión de Stripe (metadata `sup_order_id`).
 * Acá consultamos SUP (o usamos lo último que llegó por webhook), guardamos el
 * estado en la metadata de Stripe —así sobrevive a reinicios del servidor— y
 * avisamos al cliente la primera vez que aparece un número de seguimiento.
 */
import { type StripeEnv, createStripeClient } from '@/lib/stripe.server';
import { getShipmentStatus, putShipmentStatus } from '@/lib/suppliers/shipment-store.server';
import { notifyCustomerShipped } from '@/lib/notifications/shipping-notify.server';

const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

export interface TrackingSnapshot {
  status?: string;
  tracking?: string;
  carrier?: string;
  trackingUrl?: string;
}

export function readTrackingFromDetail(detail: Record<string, unknown>): TrackingSnapshot {
  return {
    status: str(detail.status ?? detail.order_status ?? detail.state) || undefined,
    tracking:
      str(detail.tracking_number ?? detail.trackingNo ?? detail.waybill ?? detail.logistics_no) || undefined,
    carrier: str(detail.shipping_method ?? detail.carrier ?? detail.logistics_name) || undefined,
    trackingUrl: str(detail.tracking_url ?? detail.logistics_url) || undefined,
  };
}

/** ¿SUP ya despachó? Hay tracking o el estado lo dice explícitamente. */
export function isShipped(snapshot: TrackingSnapshot) {
  const status = (snapshot.status ?? '').toLowerCase();
  return Boolean(snapshot.tracking) || /ship|dispatch|transit|delivered|enviado|despach/.test(status);
}

export interface SyncedOrder {
  sessionId: string;
  supOrderId: string;
  status?: string;
  tracking?: string;
  carrier?: string;
  trackingUrl?: string;
  shippedAt?: string;
  notifiedAt?: string;
  notifyPending?: string;
  changed: boolean;
}

export interface SyncResult {
  ok: boolean;
  checked: number;
  updated: number;
  notified: number;
  orders: SyncedOrder[];
  message?: string;
}

/**
 * Recorre las compras pagadas, refresca su estado en SUP y notifica los despachos nuevos.
 * Es idempotente: la marca `sup_notified_at` impide avisar dos veces al mismo cliente.
 */
export async function syncSupTracking(env: StripeEnv, limit = 50): Promise<SyncResult> {
  const stripe = createStripeClient(env);
  const { getOrderDetail } = await import('@/lib/suppliers/sup-api.server');

  const sessions = await stripe.checkout.sessions.list({ limit: Math.min(Math.max(limit, 1), 100) });
  const targets = sessions.data.filter(
    (session) => session.payment_status === 'paid' && (session.metadata ?? {}).sup_order_id,
  );

  const orders: SyncedOrder[] = [];
  let updated = 0;
  let notified = 0;

  for (const session of targets) {
    const metadata = (session.metadata ?? {}) as Record<string, string>;
    const supOrderId = metadata.sup_order_id;

    let snapshot: TrackingSnapshot = {};
    try {
      snapshot = readTrackingFromDetail(await getOrderDetail(supOrderId));
    } catch {
      // Si SUP no responde usamos lo último que llegó por webhook.
      const cached = getShipmentStatus(supOrderId);
      if (cached) {
        snapshot = {
          status: cached.status,
          tracking: cached.tracking,
          carrier: cached.carrier,
          trackingUrl: cached.trackingUrl,
        };
      }
    }

    const webhook = getShipmentStatus(supOrderId);
    if (webhook?.tracking && !snapshot.tracking) {
      snapshot = { ...snapshot, ...webhook };
    }

    const changed =
      (snapshot.status ?? '') !== (metadata.sup_status ?? '') ||
      (snapshot.tracking ?? '') !== (metadata.sup_tracking ?? '') ||
      (snapshot.carrier ?? '') !== (metadata.sup_carrier ?? '');

    const shippedNow = isShipped(snapshot);
    const shippedAt = metadata.sup_shipped_at || (shippedNow ? new Date().toISOString() : '');

    const patch: Record<string, string> = {};
    if (changed) {
      patch.sup_status = snapshot.status ?? '';
      patch.sup_tracking = snapshot.tracking ?? '';
      patch.sup_carrier = snapshot.carrier ?? '';
      patch.sup_tracking_url = snapshot.trackingUrl ?? '';
      patch.sup_synced_at = new Date().toISOString();
    }
    if (shippedAt && !metadata.sup_shipped_at) patch.sup_shipped_at = shippedAt;

    let notifiedAt = metadata.sup_notified_at || '';
    let notifyPending = metadata.sup_notify_error || '';

    if (shippedNow && snapshot.tracking && !notifiedAt) {
      const result = await notifyCustomerShipped({
        email: session.customer_details?.email ?? '',
        customer: session.customer_details?.name ?? '',
        tracking: snapshot.tracking,
        carrier: snapshot.carrier,
        trackingUrl: snapshot.trackingUrl,
        supOrderId,
      });
      if (result.sent) {
        notifiedAt = new Date().toISOString();
        notifyPending = '';
        patch.sup_notified_at = notifiedAt;
        patch.sup_notify_error = '';
        notified += 1;
      } else {
        notifyPending = result.message;
        patch.sup_notify_error = result.message.slice(0, 400);
      }
    }

    if (Object.keys(patch).length) {
      try {
        await stripe.checkout.sessions.update(session.id, { metadata: patch });
        updated += 1;
      } catch (error) {
        console.error('No se pudo guardar el tracking en Stripe', (error as Error).message);
      }
    }

    if (snapshot.status || snapshot.tracking) {
      putShipmentStatus({
        supOrderId,
        status: snapshot.status ?? 'sin estado',
        tracking: snapshot.tracking,
        carrier: snapshot.carrier,
        trackingUrl: snapshot.trackingUrl,
        updatedAt: new Date().toISOString(),
      });
    }

    orders.push({
      sessionId: session.id,
      supOrderId,
      ...snapshot,
      shippedAt: shippedAt || undefined,
      notifiedAt: notifiedAt || undefined,
      notifyPending: notifyPending || undefined,
      changed,
    });
  }

  return { ok: true, checked: targets.length, updated, notified, orders };
}

/** Marca un pedido como avisado (cuando el aviso se mandó a mano). */
export async function markCustomerNotified(sessionId: string, env: StripeEnv) {
  const stripe = createStripeClient(env);
  await stripe.checkout.sessions.update(sessionId, {
    metadata: { sup_notified_at: new Date().toISOString(), sup_notify_error: '' },
  });
}

/** Reenvía (o envía por primera vez) el aviso de despacho de un pedido puntual. */
export async function notifyOrderShipped(sessionId: string, env: StripeEnv) {
  const stripe = createStripeClient(env);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  if (!metadata.sup_tracking) return { sent: false, message: 'Todavía no hay número de seguimiento.' };

  const result = await notifyCustomerShipped({
    email: session.customer_details?.email ?? '',
    customer: session.customer_details?.name ?? '',
    tracking: metadata.sup_tracking,
    carrier: metadata.sup_carrier || undefined,
    trackingUrl: metadata.sup_tracking_url || undefined,
    supOrderId: metadata.sup_order_id ?? '',
  });

  await stripe.checkout.sessions.update(sessionId, {
    metadata: result.sent
      ? { sup_notified_at: new Date().toISOString(), sup_notify_error: '' }
      : { sup_notify_error: result.message.slice(0, 400) },
  });

  return result;
}
