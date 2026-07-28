/**
 * Cupones sincronizados desde Shopify (Discount codes / Price rules).
 *
 * Origen: Shopify Admin → Descuentos. Esta es la copia local que usa el
 * checkout propio de Youtumundial (que cobra con Stripe, no con el checkout
 * de Shopify), por eso el código y sus límites se replican acá.
 *
 * Para agregar o quitar un cupón: creálo/borralo en Shopify y pedime
 * "sincroniza los cupones de Shopify".
 */

import type { Coupon } from './coupons';

export interface ShopifyCoupon extends Coupon {
  /** ID de la price rule en Shopify (referencia). */
  shopifyPriceRuleId?: string;
  /** Válido desde (ISO). */
  startsAt?: string;
  /** Vence en (ISO). */
  endsAt?: string;
}

/**
 * Snapshot sincronizado desde la tienda de Shopify.
 *
 * REGLA DE SEGURIDAD: acá NO se sincronizan cupones del 100% de descuento.
 * Un cupón público del 100% permitiría crear pedidos físicos en $0 y generar
 * costos reales con el proveedor (SUP). Las pruebas gratis se hacen únicamente
 * con el cupón secreto del servidor (`TEST_COUPON_CODE`).
 */
export const shopifyCoupons: ShopifyCoupon[] = [];

const norm = (s: string) => s.trim().toUpperCase().replace(/[\s-]+/g, '');

/** Devuelve el cupón de Shopify vigente para ese código, o null. */
export function findShopifyCoupon(code: string, now: Date = new Date()): ShopifyCoupon | null {
  const wanted = norm(code);
  const found = shopifyCoupons.find((c) => norm(c.code) === wanted && c.active !== false);
  if (!found) return null;
  // Los cupones del 100% nunca se aceptan desde la lista pública.
  if ((found.percentOff ?? 0) >= 100) return null;
  if (found.startsAt && now < new Date(found.startsAt)) return null;
  if (found.endsAt && now > new Date(found.endsAt)) return null;
  return found;
}

/** Cupones de Shopify vigentes ahora (para pasarlos al validador). */
export function activeShopifyCoupons(now: Date = new Date()): ShopifyCoupon[] {
  return shopifyCoupons.filter((c) => findShopifyCoupon(c.code, now) !== null);
}
