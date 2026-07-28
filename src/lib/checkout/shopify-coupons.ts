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

/** Snapshot sincronizado el 2026-07-28 desde la tienda de Shopify. */
export const shopifyCoupons: ShopifyCoupon[] = [
  {
    code: 'PRUEBA100',
    percentOff: 100,
    freeShipping: true,
    label: 'Pedido de prueba (100% de descuento)',
    active: true,
    shopifyPriceRuleId: '1607706673427',
    startsAt: '2026-07-28T04:00:00.000Z',
    endsAt: '2026-08-11T23:59:59.000Z',
  },
];

const norm = (s: string) => s.trim().toUpperCase().replace(/[\s-]+/g, '');

/** Devuelve el cupón de Shopify vigente para ese código, o null. */
export function findShopifyCoupon(code: string, now: Date = new Date()): ShopifyCoupon | null {
  const wanted = norm(code);
  const found = shopifyCoupons.find((c) => norm(c.code) === wanted && c.active !== false);
  if (!found) return null;
  if (found.startsAt && now < new Date(found.startsAt)) return null;
  if (found.endsAt && now > new Date(found.endsAt)) return null;
  return found;
}

/** Cupones de Shopify vigentes ahora (para pasarlos al validador). */
export function activeShopifyCoupons(now: Date = new Date()): ShopifyCoupon[] {
  return shopifyCoupons.filter((c) => findShopifyCoupon(c.code, now) !== null);
}
