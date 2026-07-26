import type { Cart } from '@/lib/data/types';
import { checkoutConfig, type ShippingCountry, FREE_SHIPPING_THRESHOLD } from './config';

export type PaymentMethod = 'card' | 'paypal' | 'yape';

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  total: number;
  totalPen: number;
}

export function getTotals(cart: Cart, country: ShippingCountry): OrderTotals {
  const subtotal = cart.subtotal;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : country.shipping;
  const total = subtotal + shipping;
  return {
    subtotal,
    shipping,
    total,
    totalPen: Math.round(total * checkoutConfig.usdToPen * 100) / 100,
  };
}

/**
 * Construye la URL del checkout de WooCommerce con el carrito precargado.
 * Woo acepta `add-to-cart` con IDs separados por coma cuando el plugin de
 * "fill cart" está activo; el fallback lleva al carrito de la tienda.
 */
export function buildWooCheckoutUrl(cart: Cart, method: PaymentMethod): string | null {
  const base = checkoutConfig.wooStoreUrl.replace(/\/$/, '');
  if (!base) return null;

  const items = cart.items
    .map((item) => `${item.variantId || item.productId}:${item.quantity}`)
    .join(',');

  const params = new URLSearchParams({
    'fill-cart': items,
    'payment-method': method === 'paypal' ? 'paypal' : 'stripe',
  });

  return `${base}/checkout/?${params.toString()}`;
}

/**
 * Link de pago de Mercado Pago (Checkout Pro).
 * Provisional hasta tener backend: usa el link fijo del panel de MP.
 */
export function buildMercadoPagoLink(): string | null {
  return checkoutConfig.mercadoPagoLink || null;
}

/** Link de PayPal.me con el monto exacto en USD. */
export function buildPaypalLink(total: number): string | null {
  if (!checkoutConfig.paypalMe) return null;
  return `https://paypal.me/${checkoutConfig.paypalMe}/${total.toFixed(2)}USD`;
}


/** Mensaje de WhatsApp con el detalle del pedido para pagos Yape/Plin. */
export function buildWhatsappOrderLink(
  cart: Cart,
  country: ShippingCountry,
  totals: OrderTotals,
  customer: { name: string; email: string; address: string },
): string {
  const lines = [
    `*Nuevo pedido — ${checkoutConfig.storeName}*`,
    '',
    ...cart.items.map(
      (item) =>
        `• ${item.quantity}x ${item.product.title} (${item.variant.title}) — $${(
          item.variant.price * item.quantity
        ).toFixed(2)}`,
    ),
    '',
    `Subtotal: $${totals.subtotal.toFixed(2)}`,
    `Envío (${country.name}): ${totals.shipping === 0 ? 'Gratis' : `$${totals.shipping.toFixed(2)}`}`,
    `*Total: $${totals.total.toFixed(2)} USD (S/ ${totals.totalPen.toFixed(2)})*`,
    '',
    `Nombre: ${customer.name}`,
    `Email: ${customer.email}`,
    `Dirección: ${customer.address}`,
    `País: ${country.name}`,
    '',
    'Adjunto la captura del pago por Yape/Plin.',
  ];

  return `https://wa.me/${checkoutConfig.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
}
