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
import { shippingCountryFor } from './config';
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
  /** GID de la variante real en Shopify (si el catálogo viene de Shopify). */
  shopifyVariantId?: string;

}

export interface PricedOrder {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: Coupon | null;
  /** Total fijo de un cupón de prueba: Stripe cobra este importe único. */
  fixedTotal?: number;
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
  isUpsellIncluded?: boolean; // New flag for upsell logic
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
      shopifyVariantId: String(variant.id).startsWith('gid://shopify/ProductVariant/')
        ? String(variant.id)
        : undefined,
    });

  }

  subtotal = Math.round(subtotal * 100) / 100;

  // Lógica de Ofertas de Pack (Bundle & Save):
  // Buy 1: $43.99 (Precio Base)
  // Buy 2: $69.99 (Aprox 20% OFF)
  // Buy 3: $89.99 (Aprox 30% OFF)
  let automaticDiscount = 0;
  const totalQuantity = params.items.reduce((sum, item) => sum + item.quantity, 0);

  if (!params.couponCode) {
    if (totalQuantity === 2) {
      // Precio objetivo $69.99 -> Descuento = (43.99 * 2) - 69.99 = 17.99
      automaticDiscount = 17.99;
    } else if (totalQuantity >= 3) {
      // Precio objetivo $89.99 (para 3) -> Descuento = (43.99 * 3) - 89.99 = 41.98
      // Si son más de 3, mantenemos el descuento base del pack de 3
      automaticDiscount = 41.98 + (Math.max(0, totalQuantity - 3) * 15);
    }
  }

  let coupon: Coupon | null = null;
  if (params.couponCode) {
    const { getSecretTestCoupon } = await import('./secret-coupon.server');
    const secret = getSecretTestCoupon();
    const result = findCoupon(params.couponCode, subtotal, secret ? [secret] : []);
    if (!result.ok) throw new Error(result.message);
    coupon = result.coupon;
  }

  let discount = couponDiscount(coupon, subtotal);
  
  // Si no hay cupón, aplicamos el descuento automático de pack
  if (!discount && automaticDiscount > 0) {
    discount = automaticDiscount;
    coupon = {
      code: 'BUNDLE_SAVE',
      percentOff: Math.round((automaticDiscount / subtotal) * 100),
      label: '¡Oferta de Pack Aplicada!',
      active: true
    };
  }

  const discounted = Math.max(0, subtotal - discount);
  const country = shippingCountryFor(params.countryCode);

  // Cupón de prueba con total fijo (ej. $1.00): envío gratis y cobro único en
  // Stripe. Las líneas reales se conservan para el despacho (SUP/Shopify).
  if (typeof coupon?.fixedTotal === 'number') {
    const total = Math.max(0.5, Math.round(coupon.fixedTotal * 100) / 100);
    return {
      lines,
      subtotal,
      discount: Math.round((subtotal - total) * 100) / 100,
      shipping: 0,
      total,
      coupon,
      fixedTotal: total,
    };
  }

  // Tarifa real sincronizada desde los perfiles de envío de Shopify
  // (EE.UU., Canadá, Perú, Reino Unido) con fallback a la tarifa fija.
  const { resolveShippingCost } = await import('./shipping.server');
  const shipping = await resolveShippingCost({
    items: params.items,
    countryCode: country.code,
    discountedSubtotal: discounted,
    freeShipping: coupon?.freeShipping,
  });
  const total = Math.round((discounted + shipping) * 100) / 100;

  // Defensa en profundidad: un pedido de $0 despacha mercadería real y la pagás
  // vos en la wallet de SUP. Solo lo permite el cupón de prueba secreto.
  if (total < 0.5) {
    const { isFreeOrderAllowed } = await import('./secret-coupon.server');
    if (!isFreeOrderAllowed(coupon?.code)) {
      throw new Error('Este cupón no está disponible en este momento.');
    }
  }

  // El descuento se reparte proporcionalmente entre las líneas para Stripe.
  const factor = subtotal > 0 ? discounted / subtotal : 1;
  const pricedLines = lines.map((line) => ({
    ...line,
    amountInCents: Math.max(1, Math.round(line.amountInCents * factor)),
  }));

  return { lines: pricedLines, subtotal, discount, shipping, total, coupon };
}
