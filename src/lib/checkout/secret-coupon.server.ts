/**
 * Cupón de prueba secreto (solo servidor).
 *
 * El código NO vive en el código del navegador: se configura con el secreto
 * `TEST_COUPON_CODE`. Así podés hacer un pedido de prueba gratis sin que nadie
 * pueda adivinar el código y pedir mercadería real sin pagar.
 */
import type { Coupon } from './coupons';

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

/** Solo el cupón secreto puede dejar un pedido en $0. */
export function isFreeOrderAllowed(couponCode?: string | null): boolean {
  const norm = (s: string) => s.trim().toUpperCase().replace(/[\s-]+/g, '');
  if (!couponCode) return false;

  // 1) Cupón de prueba secreto (solo servidor).
  const secret = getSecretTestCoupon();
  if (secret && norm(couponCode) === norm(secret.code)) return true;

  // 2) Cupón del 100% creado en Shopify y sincronizado acá: solo mientras
  //    esté dentro de su ventana de vigencia (ver shopify-coupons.ts).
  const shopify = findShopifyCoupon(couponCode);
  return Boolean(shopify && shopify.percentOff === 100);
}

