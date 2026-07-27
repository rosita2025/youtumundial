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
