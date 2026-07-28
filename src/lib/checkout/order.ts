import type { Cart } from '@/lib/data/types';
import { checkoutConfig, type ShippingCountry, FREE_SHIPPING_THRESHOLD } from './config';
import { couponDiscount, type Coupon } from './coupons';

export type PaymentMethod = 'card' | 'paypal' | 'yape';

export interface OrderTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  totalPen: number;
}

export function getTotals(
  cart: Cart,
  country: ShippingCountry,
  coupon: Coupon | null = null,
): OrderTotals {
  const subtotal = cart.subtotal;
  const discount = couponDiscount(coupon, subtotal);
  const discounted = Math.max(0, subtotal - discount);
  const shipping =
    coupon?.freeShipping || discounted >= FREE_SHIPPING_THRESHOLD ? 0 : country.shipping;
  const total = Math.round((discounted + shipping) * 100) / 100;
  return {
    subtotal,
    discount,
    shipping,
    total,
    totalPen: Math.round(total * checkoutConfig.usdToPen * 100) / 100,
  };
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
  customer: { name: string; email: string; phone?: string; address: string },
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
    ...(totals.discount > 0 ? [`Descuento cupón: -$${totals.discount.toFixed(2)}`] : []),
    `Envío (${country.name}): ${totals.shipping === 0 ? 'Gratis' : `$${totals.shipping.toFixed(2)}`}`,
    `*Total: $${totals.total.toFixed(2)} USD (S/ ${totals.totalPen.toFixed(2)})*`,
    '',
    `Nombre: ${customer.name}`,
    `Email: ${customer.email}`,
    ...(customer.phone ? [`Teléfono: ${customer.phone}`] : []),
    `Dirección: ${customer.address}`,
    `País: ${country.name}`,
    '',
    'Adjunto la captura del pago por Yape/Plin.',
  ];

  return `https://wa.me/${checkoutConfig.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
}
