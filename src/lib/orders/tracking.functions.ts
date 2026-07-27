import { createServerFn } from '@tanstack/react-start';
import type { PublicTracking } from '@/lib/orders/tracking.server';

export type { PublicTracking } from '@/lib/orders/tracking.server';

/** Consulta pública del estado y tracking de un pedido. */
export const trackOrder = createServerFn({ method: 'POST' })
  .inputValidator((input: { reference: string }) => ({
    reference: String(input?.reference ?? '')
      .trim()
      .slice(0, 80),
  }))
  .handler(async ({ data }): Promise<PublicTracking> => {
    const { trackPublicOrder } = await import('@/lib/orders/tracking.server');
    return trackPublicOrder(data.reference);
  });
