import { useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/lib/data/types';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyAddToCartProps {
  product: Product;
  selectedVariant: ProductVariant | null;
  quantity: number;
  onAdd: () => void;
}

export function StickyAddToCart({ product, selectedVariant, quantity, onAdd }: StickyAddToCartProps) {
  const [isVisible, setIsVisible] = useState(false);

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
        <div className="hidden sm:flex items-center gap-4 overflow-hidden">
          <img
            src={product.images[0]?.url}
            alt={product.title}
            className="h-12 w-12 rounded-md object-cover border border-border shrink-0"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-medium truncate">{product.title}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {selectedVariant.title !== 'Default Title' ? selectedVariant.title : ''}
              {selectedVariant.title !== 'Default Title' ? ' · ' : ''}
              {formatPrice(product.price)}
            </p>
            <div className="flex items-center gap-2 mt-0.5 opacity-60">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-2 w-auto" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-3 w-auto" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-2 w-auto" />
            </div>
          </div>
        </div>

        <div className="flex-1 sm:flex-initial flex items-center gap-3">
          <div className="text-right sm:hidden">
            <p className="text-sm font-bold">{formatPrice(product.price)}</p>
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
