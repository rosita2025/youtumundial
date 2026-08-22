import { useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/lib/data/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatPrice } from '@/lib/utils/format';
import { ShoppingCart, Star, Truck, RotateCcw, Gem, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReviewSummary } from '@/lib/reviews/use-reviews';
import { StarRating } from '@/components/product/StarRating';
import { ProductTrustStrip } from '@/components/product/ProductTrustStrip';
import { deliveryEstimatePhrase, inStockLabel } from '@/lib/utils/product-trust';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/checkout/config';

interface StickyAddToCartProps {
  product: Product;
  selectedVariant: ProductVariant | null;
  quantity: number;
  onAdd: () => void;
  countryCode?: string;
}

export function StickyAddToCart({ product, selectedVariant, quantity, onAdd, countryCode }: StickyAddToCartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const reviewSummary = useReviewSummary(product.slug);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!selectedVariant) return null;

  const stockLabel = inStockLabel(selectedVariant);
  const isLowStock = stockLabel.startsWith('Only');
  const deliveryEstimate = deliveryEstimatePhrase(countryCode);
  const subtotal = product.price * quantity;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border p-3 shadow-lg transition-transform duration-300 md:px-8",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="container-wide space-y-2">
        {/* Free shipping progress — visible on all sizes */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{remainingForFreeShipping > 0 ? `${formatPrice(remainingForFreeShipping)} away from free shipping` : 'Free shipping unlocked'}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <Progress value={freeShippingProgress} className="h-1.5" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={product.images[0]?.url}
              alt={product.title}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-md object-cover border border-border shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium truncate">{product.title}</h3>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] sm:text-xs font-bold whitespace-nowrap">
                    {formatPrice(product.price)}
                  </p>
                  {reviewSummary.total > 0 && (
                    <div className="flex items-center gap-1 border-l border-border pl-1.5">
                      <StarRating rating={reviewSummary.average} size={10} />
                      <span className="text-[10px] text-muted-foreground hidden xs:inline">
                        ({reviewSummary.total})
                      </span>
                    </div>
                  )}
                </div>

                <div className="hidden md:flex items-center gap-3 text-[10px] text-muted-foreground border-l border-border pl-3">
                  <span className="flex items-center gap-1"><Truck size={10} /> {deliveryEstimate}</span>
                  <span className={cn('flex items-center gap-1', isLowStock && 'text-destructive')}>
                    <Package size={10} /> {stockLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1 opacity-60">
                <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-4 sm:h-6 w-auto" />
                <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-4 sm:h-6 w-auto" />
                <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-4 sm:h-6 w-auto" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block md:hidden text-[9px] text-muted-foreground space-y-0.5 mr-2">
              <span className="flex items-center gap-1"><Truck size={8} /> Fast Shipping</span>
              <span className={cn('flex items-center gap-1', isLowStock && 'text-destructive')}>
                <Package size={8} /> {stockLabel}
              </span>
            </div>
            <Button 
              className="flex-1 sm:w-48 gap-2" 
              onClick={onAdd}
              disabled={!selectedVariant.available}
            >
              <ShoppingCart size={18} />
              <span className="hidden xs:inline">
                {selectedVariant.available ? 'Add to Bag' : 'Out of Stock'}
              </span>
              <span className="xs:hidden">
                {selectedVariant.available ? 'Add' : 'Sold Out'}
              </span>
            </Button>
          </div>
        </div>

        {/* Mobile trust strip */}
        <div className="md:hidden">
          <ProductTrustStrip compact />
        </div>
      </div>
    </div>
  );
}
