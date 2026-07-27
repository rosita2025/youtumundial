import { createServerFn } from '@tanstack/react-start';
import type { AdminOrder } from '@/lib/admin/orders.server';

export type { AdminOrder } from '@/lib/admin/orders.server';

export interface AdminOrdersResult {
  ok: boolean;
  orders: AdminOrder[];
  message?: string;
}

/** Lista los pedidos pagados y su estado dentro de SUP Dropshipping. */
export const listOrders = createServerFn({ method: 'POST' })
  .inputValidator((input: { environment?: 'sandbox' | 'live' }) => ({
    environment: input?.environment === 'sandbox' ? ('sandbox' as const) : ('live' as const),
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
      return url ? { ok: true, url } : { ok: false, message: 'SUP no devolvió un link de pago.' };
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }
  });

