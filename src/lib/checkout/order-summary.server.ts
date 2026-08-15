import { createStripeClient, type StripeEnv } from '@/lib/stripe.server';
import type { OrderSummary, OrderSummaryLine } from './order-summary.functions';

const cents = (value: number | null | undefined) => (value ?? 0) / 100;

/** Lee la sesión de Stripe y arma el resumen que ve el cliente al confirmar. */
export async function buildOrderSummary(
  sessionId: string,
  environment: StripeEnv,
): Promise<OrderSummary> {
  const empty: OrderSummary = {
    ok: false,
    paid: false,
    currency: 'USD',
    lines: [],
    subtotal: 0,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: 0,
  };

  try {
    const stripe = createStripeClient(environment);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    const lines: OrderSummaryLine[] = (session.line_items?.data ?? []).map((item) => ({
      description: item.description ?? 'Producto',
      quantity: item.quantity ?? 1,
      amount: cents(item.amount_total),
    }));

    const breakdown = session.total_details;
    const shippingAmount = cents(breakdown?.amount_shipping);
    const taxAmount = cents(breakdown?.amount_tax);
    const discountAmount = cents(breakdown?.amount_discount);

    const shippingDetails = (
      session as unknown as {
        collected_information?: { shipping_details?: { name?: string; address?: Record<string, string> } };
        shipping_details?: { name?: string; address?: Record<string, string> };
      }
    ).collected_information?.shipping_details ??
      (session as unknown as { shipping_details?: { name?: string; address?: Record<string, string> } })
        .shipping_details;

    const addr = shippingDetails?.address ?? session.customer_details?.address ?? undefined;
    const address = addr
      ? [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
          .filter(Boolean)
          .join(', ')
      : undefined;

    return {
      ok: true,
      paid: session.payment_status === 'paid',
      currency: (session.currency ?? 'usd').toUpperCase(),
      lines,
      subtotal: cents(session.amount_subtotal),
      shipping: shippingAmount,
      tax: taxAmount,
      discount: discountAmount,
      total: cents(session.amount_total),
      email: session.customer_details?.email ?? undefined,
      name: shippingDetails?.name ?? session.customer_details?.name ?? undefined,
      address,
    };
  } catch (error) {
    console.error('[OrderSummary] no se pudo leer la sesión', error);
    return { ...empty, message: 'No pudimos cargar el detalle del pedido.' };
  }
}
