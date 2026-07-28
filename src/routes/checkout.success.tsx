import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Alias de compatibilidad: /checkout/success → /checkout/return
 *
 * Stripe (u otros medios de pago) pueden estar configurados con
 * `/checkout/success`. Redirigimos conservando `session_id`, `free` y `order`
 * para que la página de confirmación muestre el número de pedido de Shopify.
 */
export const Route = createFileRoute('/checkout/success')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { session_id?: string; free?: string; order?: string } => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
    free: typeof search.free === 'string' ? search.free : undefined,
    order: typeof search.order === 'string' ? search.order.slice(0, 20) : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/checkout/return', search, replace: true });
  },
});
