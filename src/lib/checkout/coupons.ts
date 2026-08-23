/**
 * Cupones de descuento de Youtumundial.
 * Editá esta lista para crear, cambiar o desactivar códigos.
 */

export interface Coupon {
  /** Código que escribe el cliente (se compara en mayúsculas, sin espacios). */
  code: string;
  /** Descuento en % sobre el subtotal (0–100). */
  percentOff?: number;
  /** Descuento fijo en USD sobre el subtotal. */
  amountOff?: number;
  /** Fija el total final del pedido en este importe exacto en USD (para pruebas). */
  fixedTotal?: number;
  /** Pone el envío en $0. */
  freeShipping?: boolean;
  /** Texto que ve el cliente al aplicarlo. */
  label: string;
  /** Compra mínima en USD para que sea válido. */
  minSubtotal?: number;
  /** Si está activo. */
  active?: boolean;
}

export const coupons: Coupon[] = [
  {
    code: 'WELCOME5',
    percentOff: 5,
    label: '5% off for your first order',
    active: true,
  },
  {
    code: 'WELCOME10',
    percentOff: 10,
    label: '10% welcome discount',
    active: true,
  },
  {
    code: 'YOUTU20',
    percentOff: 20,
    label: '20% discount',
    minSubtotal: 30,
    active: true,
  },
  {
    code: 'FREESHIPPING',
    freeShipping: true,
    label: 'Free worldwide shipping',
    active: true,
  },
  {
    // Test coupon: sets the order to exactly $1.00 with free shipping
    // to verify the real charge on Stripe. Deactivate it (active: false)
    // when you finish testing.
    code: 'TEST1DOLLAR',
    fixedTotal: 1,
    freeShipping: true,
    label: 'Test order: $1.00 total with free shipping',
    active: true,
  },

  {
    // DEACTIVATED for security: a public 100% coupon allows
    // anyone who knows the code to order free physical goods
    // (the order is automatically created in SUP and paid by you).
    // For a specific test: activate it, make the purchase and set it back to false.
    code: 'TEST100',
    percentOff: 100,
    freeShipping: true,
    label: 'Free test order (100% discount)',
    active: false,
  },
];

export type CouponResult =
  | { ok: true; coupon: Coupon }
  | { ok: false; message: string };

export function findCoupon(
  input: string,
  subtotal: number,
  extra: Coupon[] = [],
): CouponResult {
  const norm = (s: string) => s.trim().toUpperCase().replace(/[\s-]+/g, '');
  const code = norm(input);
  if (!code) return { ok: false, message: 'Please enter a coupon code.' };

  const coupon = [...extra, ...coupons].find((c) => norm(c.code) === code && c.active !== false);
  if (!coupon) {
    // TEST100 remained deactivated on purpose: a public 100% allows
    // anyone to order free physical goods. The private test code is used.
    return {
      ok: false,
      message:
        code === 'TEST100'
          ? 'TEST100 was deactivated for security. Use your private test code.'
          : 'That coupon does not exist or has expired.',
    };
  }


  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      message: `This coupon requires a minimum purchase of $${coupon.minSubtotal.toFixed(2)}.`,
    };
  }

  return { ok: true, coupon };
}

/** Descuento en USD que aplica el cupón sobre el subtotal. */
export function couponDiscount(coupon: Coupon | null, subtotal: number): number {
  if (!coupon) return 0;
  // Cupón de total fijo: el descuento es todo lo que sobra por encima del total fijo.
  if (typeof coupon.fixedTotal === 'number') {
    const discount = Math.max(0, subtotal - coupon.fixedTotal);
    return Math.round(discount * 100) / 100;
  }
  let discount = 0;
  if (coupon.percentOff) discount += (subtotal * coupon.percentOff) / 100;
  if (coupon.amountOff) discount += coupon.amountOff;
  return Math.min(Math.round(discount * 100) / 100, subtotal);
}
