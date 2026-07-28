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
    code: 'BIENVENIDA10',
    percentOff: 10,
    label: '10% de descuento de bienvenida',
    active: true,
  },
  {
    code: 'YOUTU20',
    percentOff: 20,
    label: '20% de descuento',
    minSubtotal: 30,
    active: true,
  },
  {
    code: 'ENVIOGRATIS',
    freeShipping: true,
    label: 'Envío gratis a cualquier país',
    active: true,
  },
  {
    // DESACTIVADO por seguridad: un cupón del 100% público permite que
    // cualquiera que conozca el código pida mercadería física gratis
    // (el pedido se crea automáticamente en SUP y lo pagás vos).
    // Para una prueba puntual: activalo, hacé la compra y volvé a ponerlo en false.
    code: 'PRUEBA100',
    percentOff: 100,
    freeShipping: true,
    label: 'Pedido de prueba gratis (100% de descuento)',
    active: false,
  },
];

export type CouponResult =
  | { ok: true; coupon: Coupon }
  | { ok: false; message: string };

export function findCoupon(input: string, subtotal: number): CouponResult {
  const code = input.trim().toUpperCase();
  if (!code) return { ok: false, message: 'Escribí un código de cupón.' };

  const coupon = coupons.find((c) => c.code === code && c.active !== false);
  if (!coupon) return { ok: false, message: 'Ese cupón no existe o ya venció.' };

  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      message: `Este cupón requiere una compra mínima de $${coupon.minSubtotal.toFixed(2)}.`,
    };
  }

  return { ok: true, coupon };
}

/** Descuento en USD que aplica el cupón sobre el subtotal. */
export function couponDiscount(coupon: Coupon | null, subtotal: number): number {
  if (!coupon) return 0;
  let discount = 0;
  if (coupon.percentOff) discount += (subtotal * coupon.percentOff) / 100;
  if (coupon.amountOff) discount += coupon.amountOff;
  return Math.min(Math.round(discount * 100) / 100, subtotal);
}
