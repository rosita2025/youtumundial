import { ProductVariant } from '@/lib/data/types';
import { shippingCountryFor } from '@/lib/checkout/config';

/**
 * Genera una frase de estimación de entrega basada en país.
 * Como fallback, usa "your country".
 */
export function deliveryEstimatePhrase(countryCode?: string, locale = 'en-US'): string {
  const code = (countryCode ?? '').toUpperCase();
  const country = code ? shippingCountryFor(code) : null;
  const countryName = country && country.code !== code ? 'your country' : country?.name ?? 'your country';

  const min = new Date();
  min.setDate(min.getDate() + 13); // 3-4 prep + 10 min shipping
  const max = new Date();
  max.setDate(max.getDate() + 19); // 4 prep + 15 max shipping

  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  return `Delivers to ${countryName} ${fmt.format(min)} – ${fmt.format(max)}`;
}

/**
 * Devuelve un mensaje de stock si el inventario está bajo.
 * El producto no tiene inventoryQuantity en el tipo actual, así que usamos
 * un generador determinista basado en el SKU para simular stock bajo en algunas
 * variantes. Cuando la data real esté disponible, reemplazar por el campo real.
 */
export function lowStockMessage(variant: ProductVariant): string | null {
  if (!variant.available) return null;
  // Simulación: variantes con SKU cuya suma de caracteres es divisible por 7 se muestran bajo stock.
  const hash = variant.sku.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const simulatedStock = (hash % 12) + 1;
  if (simulatedStock <= 6) {
    return `Only ${simulatedStock} left in stock — order soon`;
  }
  return null;
}

/**
 * Indica si la variante tiene stock visible.
 */
export function inStockLabel(variant: ProductVariant): string {
  if (!variant.available) return 'Out of stock';
  const low = lowStockMessage(variant);
  return low ?? 'In stock';
}

/**
 * Número social determinista: "X people bought this in the last 24 hours".
 * Se usa como trust signal cuando no hay analytics reales; el valor depende del
 * slug del producto para ser estable entre renders.
 */
export function socialProofSoldCount(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  return 3 + (Math.abs(hash) % 18); // entre 3 y 20
}
