import { Product } from "@/lib/data/types";
import { formatPrice } from "@/lib/utils/format";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, CheckCircle2, Sparkles, Truck, RotateCcw, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UpsellSectionProps {
  product: Product;
  relatedProducts: Product[];
}

export function UpsellSection({ product, relatedProducts }: UpsellSectionProps) {
  const { addToCart } = useCart();
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // Filter products that could be good upsells (different from current)
  const upsellCandidates = relatedProducts
    .filter(p => p.id !== product.id)
    .slice(0, 2);

  if (upsellCandidates.length === 0) return null;

  const handleAddUpsell = (p: Product) => {
    const variant = p.variants.find(v => v.available) || p.variants[0];
    if (variant) {
      addToCart(p, variant, 1);
      setAddedItems(prev => new Set(prev).add(p.id));
      
      // Reset "added" state after 2 seconds
      setTimeout(() => {
        setAddedItems(prev => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });
      }, 2000);
    }
  };

  return (
    <div className="mt-8 p-6 border-2 border-primary/30 bg-primary/5 rounded-2xl space-y-5 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} className="text-primary animate-pulse" />
          <h3 className="text-sm font-black uppercase tracking-tighter italic">BUNDLE & SAVE</h3>
        </div>
        <div className="bg-destructive text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce">
          MOST POPULAR
        </div>
      </div>
      
      <div className="grid gap-4">
        {upsellCandidates.map((upsell) => (
          <div key={upsell.id} className="flex items-center gap-3 bg-background p-2 rounded-lg shadow-sm border border-border/50">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
              <img
                src={upsell.images[0]?.url}
                alt={upsell.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium truncate">{upsell.title}</h4>
              <p className="text-sm font-bold text-primary">{formatPrice(upsell.price)}</p>
            </div>
            <Button
              size="sm"
              variant={addedItems.has(upsell.id) ? "outline" : "default"}
              className={cn(
                "h-8 px-3 transition-all",
                addedItems.has(upsell.id) && "border-green-500 text-green-600 hover:bg-green-50"
              )}
              onClick={() => handleAddUpsell(upsell)}
            >
              {addedItems.has(upsell.id) ? (
                <CheckCircle2 size={14} />
              ) : (
                <>
                  <Plus size={14} className="mr-1" />
                  <span className="text-[10px]">Añadir</span>
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
      
      <div className="bg-yellow-100/50 border border-yellow-200 rounded-lg p-3">
        <p className="text-[11px] text-yellow-800 font-bold text-center flex items-center justify-center gap-1">
          <Sparkles size={12} />
          ¡Ahorra un 10% EXTRA automáticamente al llevar 2 o más productos!
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 opacity-50 grayscale pt-2 border-t border-primary/10">
        <div className="flex flex-col items-center gap-1 text-[8px] font-bold">
          <Truck size={12} /> FAST SHIPPING
        </div>
        <div className="flex flex-col items-center gap-1 text-[8px] font-bold">
          <RotateCcw size={12} /> EASY RETURNS
        </div>
        <div className="flex flex-col items-center gap-1 text-[8px] font-bold">
          <Shield size={12} /> SECURE PAY
        </div>
      </div>
    </div>
  );
}
