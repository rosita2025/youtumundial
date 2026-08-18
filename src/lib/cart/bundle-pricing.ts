import { CartItem } from '../data/types';

/**
 * Applies bundle pricing logic for specific products.
 * Lion Shaped Bag Bundle Rules:
 * - 1 unit: $43.99
 * - 2 units: $69.99 ($35.00 each)
 * - 3 units: $89.99 ($30.00 each)
 * 
 * New feature: Support for multiple variants (different selections) within a single bundle.
 */
export function calculateItemTotal(item: CartItem): number {
  const isLionBag = item.product.slug === 'lion-shaped-pet-canvas-shoulder-bag' || 
                    item.productId.includes('lion') ||
                    item.product.title.toLowerCase().includes('lion');

  // Check if this item is part of a bundle that has multiple selections
  // If metadata exists, we treat the quantity as the bundle size
  const metadata = (item as any).metadata;
  const isBundle = metadata?.isBundle === true;

  if (isLionBag || isBundle) {
    const qty = item.quantity;
    if (qty === 1) return 43.99;
    if (qty === 2) return 69.99;
    if (qty >= 3) {
      // 3 pack price + any additional at the best unit price ($30)
      const basePrice = 89.99;
      const extraQty = qty - 3;
      return basePrice + (extraQty * 30.00);
    }
  }

  // Default: unit price * quantity
  return (item.variant.price || 0) * item.quantity;
}

export function calculateCartTotals(items: CartItem[]): { subtotal: number; itemCount: number } {
  return items.reduce(
    (acc, item) => ({
      subtotal: acc.subtotal + calculateItemTotal(item),
      itemCount: acc.itemCount + item.quantity,
    }),
    { subtotal: 0, itemCount: 0 }
  );
}
