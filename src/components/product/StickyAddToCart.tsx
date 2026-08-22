import { useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/lib/data/types';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { ShoppingCart, Star, Truck, RotateCcw, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReviewSummary } from '@/lib/reviews/use-reviews';
import { StarRating } from '@/components/product/StarRating';

interface StickyAddToCartProps {
  product: Product;
  selectedVariant: ProductVariant | null;
  quantity: number;
  onAdd: () => void;
}

export function StickyAddToCart({ product, selectedVariant, quantity, onAdd }: StickyAddToCartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const reviewSummary = useReviewSummary(product.slug);

  useEffect(() => {
    const handleScroll = () => {
      // Mostrar después de que el botón principal de "Añadir al carrito" (aprox 600px) pase
      setIsVisible(window.scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!selectedVariant) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border p-4 shadow-lg transition-transform duration-300 md:px-8",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="container-wide flex items-center justify-between gap-4">
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
                <span className="flex items-center gap-1"><Truck size={10} /> Fast Shipping</span>
                <span className="flex items-center gap-1"><RotateCcw size={10} /> Easy Returns</span>
                <span className="flex items-center gap-1"><Gem size={10} /> Premium Quality</span>
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
            <span className="flex items-center gap-1"><RotateCcw size={8} /> Returns</span>
          </div>
          <Button 
            className="flex-1 sm:w-48 gap-2" 
            onClick={onAdd}
            disabled={!selectedVariant.available}
          >
            <ShoppingCart size={18} />
            <span className="hidden xs:inline">
              {selectedVariant.available ? 'Add to Cart' : 'Out of Stock'}
            </span>
            <span className="xs:hidden">
              {selectedVariant.available ? 'Add' : 'Sold Out'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
