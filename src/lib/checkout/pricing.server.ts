/**
 * Precios autorizados del checkout (solo servidor).
 *
 * El navegador nunca decide cuánto se cobra: solo manda qué variante y cuántas
 * unidades. Acá se resuelve el precio real desde el catálogo publicado, se
 * valida el cupón y se calcula el envío. Así nadie puede modificar el importe
 * desde las herramientas del navegador.
 */

import { fetchShopifyProducts } from '@/lib/shopify/storefront';
import { fetchStoreCatalog } from '@/lib/suppliers/catalog.functions';
import { findCoupon, couponDiscount, type Coupon } from './coupons';
import { shippingCountries, FREE_SHIPPING_THRESHOLD } from './config';
import type { Product } from '@/lib/data/types';

export interface CartLineRequest {
  variantId: string;
  quantity: number;
}

export interface PricedLine {
  name: string;
  amountInCents: number;
  quantity: number;
  supProductId?: string;
  variantTitle?: string;
  supVariantId?: string;
  supVariantSku?: string;
}

export interface PricedOrder {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: Coupon | null;
}

const MAX_QTY_PER_LINE = 20;
const MAX_LINES = 30;

export function normalizeCartLines(input: unknown): CartLineRequest[] {
  const raw = Array.isArray(input) ? input : [];
  return raw
    .slice(0, MAX_LINES)
    .map((item) => {
      const line = item as { variantId?: unknown; quantity?: unknown };
      return {
        variantId: String(line?.variantId ?? '').trim().slice(0, 200),
        quantity: Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.round(Number(line?.quantity) || 1))),
      };
    })
    .filter((line) => line.variantId.length > 0);
}

async function loadCatalog(): Promise<Product[]> {
  try {
    const shopify = await fetchShopifyProducts(100);
    if (shopify.length) return shopify;
  } catch {
    // seguimos con SUP
  }
  try {
    const res = await fetchStoreCatalog();
    const { mapSupCatalog, filterInStock } = await import('@/lib/suppliers/sup');
    const { SUP_MARGIN } = await import('@/lib/suppliers/sup-selection');
    return filterInStock(mapSupCatalog(res.products as never[], SUP_MARGIN));
  } catch {
    return [];
  }
}

/**
 * Recalcula el pedido completo con precios del catálogo real.
 * Lanza un error si alguna variante no existe o está agotada.
 */
export async function priceOrder(params: {
  items: CartLineRequest[];
  countryCode: string;
  couponCode?: string;
}): Promise<PricedOrder> {
  if (!params.items.length) throw new Error('El carrito está vacío');

  const catalog = await loadCatalog();
  const lines: PricedLine[] = [];
  let subtotal = 0;

  for (const item of params.items) {
    const product = catalog.find((p) => p.variants.some((v) => v.id === item.variantId));
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant) {
      throw new Error('Uno de los productos del carrito ya no está disponible.');
    }
    if (variant.available === false) {
      throw new Error(`${product.title} (${variant.title}) está agotado.`);
    }

    subtotal += variant.price * item.quantity;
    const supMatch = /^sup-(.+)$/.exec(String(product.id));
    const variantMatch = /^sup-[^-]+-(.+)$/.exec(String(variant.id));
    const sku = variant.sku || undefined;

    lines.push({
      name: `${product.title} — ${variant.title}`,
      amountInCents: Math.round(variant.price * 100),
      quantity: item.quantity,
      supProductId: supMatch ? supMatch[1] : sku,
      variantTitle: variant.title,
      supVariantId: variantMatch ? variantMatch[1] : undefined,
      supVariantSku: sku,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;

  let coupon: Coupon | null = null;
  if (params.couponCode) {
    const result = findCoupon(params.couponCode, subtotal);
    if (!result.ok) throw new Error(result.message);
    coupon = result.coupon;
  }

  const discount = couponDiscount(coupon, subtotal);
  const discounted = Math.max(0, subtotal - discount);
  const country =
    shippingCountries.find((c) => c.code === params.countryCode) ?? shippingCountries[0];
  const shipping =
    coupon?.freeShipping || discounted >= FREE_SHIPPING_THRESHOLD ? 0 : country.shipping;
  const total = Math.round((discounted + shipping) * 100) / 100;

  // Defensa en profundidad: un pedido de $0 despacha mercadería real y la pagás
  // vos en la wallet de SUP. Solo se permite si lo habilitás a propósito.
  if (total < 0.5 && process.env.ALLOW_FREE_TEST_ORDERS !== 'true') {
    throw new Error('Este cupón no está disponible en este momento.');
  }

  // El descuento se reparte proporcionalmente entre las líneas para Stripe.
  const factor = subtotal > 0 ? discounted / subtotal : 1;
  const pricedLines = lines.map((line) => ({
    ...line,
    amountInCents: Math.max(1, Math.round(line.amountInCents * factor)),
  }));

  return { lines: pricedLines, subtotal, discount, shipping, total, coupon };
}
