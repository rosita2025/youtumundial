/**
 * Cupón de prueba secreto (solo servidor).
 *
 * El código NO vive en el código del navegador: se configura con el secreto
 * `TEST_COUPON_CODE`. Así podés hacer un pedido de prueba gratis sin que nadie
 * pueda adivinar el código y pedir mercadería real sin pagar.
 */
import type { Coupon } from './coupons';
import { findShopifyCoupon } from './shopify-coupons';

export function getSecretTestCoupon(): Coupon | null {
  const code = (process.env.TEST_COUPON_CODE ?? '').trim().toUpperCase();
  if (code.length < 8) return null; // sin secreto configurado (o demasiado débil) → desactivado
  return {
    code,
    percentOff: 100,
    freeShipping: true,
    label: 'Pedido de prueba (100% de descuento)',
    active: true,
  };
}

/** Solo el cupón secreto del servidor puede dejar un pedido en $0. */
export function isFreeOrderAllowed(couponCode?: string | null): boolean {
  const norm = (s: string) => s.trim().toUpperCase().replace(/[\s-]+/g, '');
  if (!couponCode) return false;

  // Único camino permitido: el cupón de prueba secreto (variable de entorno
  // del servidor). Ningún cupón público/sincronizado de Shopify puede dejar
  // un pedido físico en $0, porque generaría costo real con el proveedor.
  const secret = getSecretTestCoupon();
  return Boolean(secret && norm(couponCode) === norm(secret.code));
}

