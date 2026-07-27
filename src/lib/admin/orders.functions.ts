import { createServerFn } from '@tanstack/react-start';
import { SUP_ORDER_LIST_URL } from './orders.server';
import type { AdminOrder } from '@/lib/admin/orders.server';

export type { AdminOrder } from '@/lib/admin/orders.server';

export interface AdminOrdersResult {
  ok: boolean;
  orders: AdminOrder[];
  message?: string;
}

const readEnv = (value: unknown) => (value === 'sandbox' ? ('sandbox' as const) : ('live' as const));
const readSessionId = (value: unknown) => {
  const sessionId = String(value ?? '').trim();
  if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) throw new Error('Sesión de pago inválida');
  return sessionId;
};

/** Lista los pedidos pagados y su estado dentro de SUP Dropshipping. */
export const listOrders = createServerFn({ method: 'POST' })
  .inputValidator((input: { environment?: 'sandbox' | 'live' }) => ({
    environment: readEnv(input?.environment),
  }))
  .handler(async ({ data }): Promise<AdminOrdersResult> => {
    const { listAdminOrders } = await import('@/lib/admin/orders.server');
    try {
      return { ok: true, orders: await listAdminOrders(data.environment) };
    } catch (error) {
      return { ok: false, orders: [], message: (error as Error).message };
    }
  });

/** Devuelve el link para pagar el pedido en la wallet de SUP. */
export const getSupPaymentLink = createServerFn({ method: 'POST' })
  .inputValidator((input: { supOrderId: string }) => {
    const supOrderId = String(input?.supOrderId ?? '').trim();
    if (!/^[A-Za-z0-9_-]+$/.test(supOrderId)) throw new Error('Pedido de SUP inválido');
    return { supOrderId };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; url?: string; message?: string }> => {
    const { getOrderPaymentLink } = await import('@/lib/suppliers/sup-api.server');
    try {
      const url = await getOrderPaymentLink(data.supOrderId);
      // Si SUP no devuelve link (o el pedido ya está pagado) abrimos el Member Center.
      return { ok: true, url: url || SUP_ORDER_LIST_URL };
    } catch {
      return { ok: true, url: SUP_ORDER_LIST_URL };
    }
  });

export interface SyncTrackingResult {
  ok: boolean;
  checked: number;
  updated: number;
  notified: number;
  message?: string;
}

/** Refresca estado y tracking de todos los pedidos y avisa los despachos nuevos. */
export const syncTracking = createServerFn({ method: 'POST' })
  .inputValidator((input: { environment?: 'sandbox' | 'live' }) => ({
    environment: readEnv(input?.environment),
  }))
  .handler(async ({ data }): Promise<SyncTrackingResult> => {
    const { syncSupTracking } = await import('@/lib/suppliers/tracking-sync.server');
    try {
      const result = await syncSupTracking(data.environment);
      return { ok: true, checked: result.checked, updated: result.updated, notified: result.notified };
    } catch (error) {
      return { ok: false, checked: 0, updated: 0, notified: 0, message: (error as Error).message };
    }
  });

/** Envía (o reenvía) el aviso de despacho de un pedido puntual. */
export const notifyShipped = createServerFn({ method: 'POST' })
  .inputValidator((input: { sessionId: string; environment?: 'sandbox' | 'live' }) => ({
    sessionId: readSessionId(input?.sessionId),
    environment: readEnv(input?.environment),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { notifyOrderShipped } = await import('@/lib/suppliers/tracking-sync.server');
    try {
      const result = await notifyOrderShipped(data.sessionId, data.environment);
      return { ok: result.sent, message: result.message };
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }
  });

/** Marca como avisado un pedido cuyo cliente contactaste a mano. */
export const markNotified = createServerFn({ method: 'POST' })
  .inputValidator((input: { sessionId: string; environment?: 'sandbox' | 'live' }) => ({
    sessionId: readSessionId(input?.sessionId),
    environment: readEnv(input?.environment),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { markCustomerNotified } = await import('@/lib/suppliers/tracking-sync.server');
    try {
      await markCustomerNotified(data.sessionId, data.environment);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }
  });
