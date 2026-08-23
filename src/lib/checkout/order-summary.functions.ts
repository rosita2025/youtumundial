import { createServerFn } from '@tanstack/react-start';

export interface OrderSummaryLine {
  description: string;
  quantity: number;
  amount: number;
}

export interface OrderSummary {
  ok: boolean;
  paid: boolean;
  currency: string;
  lines: OrderSummaryLine[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  email?: string;
  name?: string;
  address?: string;
  message?: string;
}

/**
 * Resumen del pedido para la página de confirmación.
 * Se lee de la sesión de Stripe (fuente de verdad del cobro), nunca del carrito
 * del navegador, para que el cliente vea exactamente lo que se le cobró.
 */
export const getOrderSummary = createServerFn({ method: 'POST' })
  .inputValidator((input: { sessionId: string; environment: 'sandbox' | 'live' }) => {
    const sessionId = String(input?.sessionId ?? '').trim();
    if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) throw new Error('Invalid payment session');
    const environment = input?.environment === 'live' ? 'live' : 'sandbox';
    return { sessionId, environment } as const;
  })
  .handler(async ({ data }): Promise<OrderSummary> => {
    const { buildOrderSummary } = await import('./order-summary.server');
    return buildOrderSummary(data.sessionId, data.environment);
  });
