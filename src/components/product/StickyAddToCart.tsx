import { useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/lib/data/types';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { ShoppingCart, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyAddToCartProps {
  product: Product;
  selectedVariant: ProductVariant | null;
  quantity: number;
  onAdd: () => void;
}

export function StickyAddToCart({ product, selectedVariant, quantity, onAdd }: StickyAddToCartProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const currentPrice = quantity === 1 ? 43.99 : quantity === 2 ? 69.99 : 89.99;

  useEffect(() => {
    const handleScroll = () => {
      // Reveal sticky bar earlier for mobile users to capture intent
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!selectedVariant) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-t border-border shadow-2xl transition-transform duration-300 transform pb-safe",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      {/* Urgency Counter - Critical for CRO */}
      <div className="bg-[#FFF4E5] border-b border-orange-100 py-2 text-center">
        <p className="text-[10px] sm:text-xs font-bold text-[#D97706] uppercase tracking-wide flex items-center justify-center gap-1.5">
          🔥 Only 14 items left in stock - Order today!
        </p>
      </div>

      <div className="p-3 sm:p-4 md:px-8">
        <div className="container-wide flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 select-none">
              <img
                src={selectedVariant.image?.url || product.images[0]?.url}
                alt={product.title}
                className="h-full w-full rounded-lg object-cover border border-border shadow-sm"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
              <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[10px] sm:text-xs font-bold truncate text-muted-foreground uppercase tracking-widest">
                {product.slug === 'lion-shaped-pet-canvas-shoulder-bag' ? 'Cozy Pet Carrier' : product.title}
              </h3>
              
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-foreground">
                  {formatPrice(currentPrice)}
                </span>
                {quantity > 1 && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">
                    Save {quantity === 2 ? '20%' : '31%'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 min-w-[140px] sm:min-w-[200px]">
            <Button 
              className="w-full h-11 sm:h-13 gap-2 bg-[#FFB800] hover:bg-[#FFB800]/90 text-black font-black text-xs sm:text-sm shadow-lg transition-transform active:scale-95 border-none"
              onClick={onAdd}
              disabled={!selectedVariant.available}
            >
              {selectedVariant.available ? (
                <>
                  <ShoppingCart size={16} className="hidden xs:block" />
                  ADD TO CART
                </>
              ) : 'OUT OF STOCK'}
            </Button>
            
            <div className="flex items-center justify-center gap-2.5 opacity-60 grayscale hover:grayscale-0 transition-all select-none">
              <div className="relative">
                <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-3.5 w-auto pointer-events-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
              </div>
              <div className="relative">
                <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-3.5 w-auto pointer-events-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
              </div>
              <div className="relative">
                <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-3.5 w-auto pointer-events-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
              </div>
              <div className="relative">
                <img src="https://img.icons8.com/color/48/apple-pay.png" alt="Apple Pay" className="h-3.5 w-auto pointer-events-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
