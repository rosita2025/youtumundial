import { Link } from '@/lib/router-compat';
import { fbEvent } from '@/lib/facebook-pixel';
import { X, Plus, Minus, ShoppingBag, Sparkles, Lock, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { getCatalog } from '@/lib/data/data-provider';
import { Product } from '@/lib/data/types';
import { calculateItemTotal } from '@/lib/cart/bundle-pricing';

export function CartDrawer() {
  const { cart, isOpen, closeCart, updateQuantity, removeItem, addToCart } = useCart();
  const [upsellProduct, setUpsellProduct] = useState<Product | null>(null);
  
  const FREE_SHIPPING_THRESHOLD = 40;
  const progress = Math.min((cart.subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - cart.subtotal;

  useEffect(() => {
    if (isOpen) {
      // Find a low cost accessory or related product for upsell
      getCatalog().then(products => {
        const accessory = products.find(p => 
          p.price < 20 && 
          !cart.items.some(item => item.productId === p.id)
        );
        if (accessory) setUpsellProduct(accessory);
      });
    }
  }, [isOpen, cart.items]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-2xl z-50 transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold flex items-center gap-2">
                <ShoppingBag size={20} className="text-primary" />
                Your Cart ({cart.itemCount})
              </h2>
              <button
                onClick={closeCart}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close cart"
              >
                <X size={24} />
              </button>
            </div>

            {/* Free Shipping Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                {cart.subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <span className="text-green-600 flex items-center gap-1.5">
                    <Sparkles size={12} className="animate-pulse" />
                    🎉 You unlocked FREE Express Shipping!
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Add <span className="text-primary">{formatPrice(remaining)}</span> for FREE Shipping
                  </span>
                )}
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-700 ease-out rounded-full",
                    cart.subtotal >= FREE_SHIPPING_THRESHOLD ? "bg-green-500" : "bg-primary"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cart Items */}
          {cart.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <ShoppingBag size={48} className="text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Your cart is empty</p>
              <p className="text-muted-foreground mb-6">
                Looks like you haven't added anything yet.
              </p>
              <Button onClick={closeCart} asChild>
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-4 animate-fade-in">
                    <Link
                      to={`/products/${item.product.slug}`}
                      onClick={closeCart}
                      className="shrink-0"
                    >
                      <img
                        src={item.product.images[0]?.url}
                        alt={item.product.title}
                        className="w-20 h-24 object-cover rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${item.product.slug}`}
                        onClick={closeCart}
                        className="font-medium hover:underline block truncate"
                      >
                        {item.product.title}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {item.variant.title}
                      </p>
                      <p className="font-bold mt-1 text-primary">
                        {formatPrice(calculateItemTotal(item))}
                        {item.quantity > 1 && item.product.slug.includes('lion') && (
                          <span className="text-[10px] text-green-600 ml-2 font-black uppercase tracking-tighter bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                            Bundle applied
                          </span>
                        )}
                      </p>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center border border-border rounded-md">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-muted transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-muted transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* In-Cart Upsell */}
              {upsellProduct && cart.items.length > 0 && (
                <div className="p-4 mx-6 mb-6 bg-primary/5 border-2 border-primary/20 rounded-2xl animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-primary fill-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest italic">Frequently Bought Together</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <img 
                      src={upsellProduct.images[0]?.url} 
                      className="w-12 h-12 rounded-lg object-cover" 
                      alt={upsellProduct.title}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{upsellProduct.title}</p>
                      <p className="text-sm font-black text-primary">{formatPrice(upsellProduct.price)}</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="h-8 px-4 text-[10px] font-bold rounded-full shadow-sm"
                      onClick={() => {
                        const variant = upsellProduct.variants.find(v => v.available) || upsellProduct.variants[0];
                        if (variant) addToCart(upsellProduct, variant, 1);
                      }}
                    >
                      ADD
                    </Button>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-lg">
                    {formatPrice(cart.subtotal)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Shipping and taxes calculated at checkout
                </p>
                <Button 
                  className="w-full h-14 text-lg font-black shadow-xl active:scale-95 bg-[#FFB800] hover:bg-[#FFB800]/90 text-black border-none" 
                  size="lg" 
                  asChild
                >
                  <Link to="/checkout" onClick={() => {
                    closeCart();
                  }}>
                    PROCEED TO CHECKOUT
                  </Link>
                </Button>

                {/* Trust Badges */}
                <div className="flex flex-col items-center gap-3 pt-2">
                  <div className="flex items-center justify-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
                    <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-5 w-auto" />
                    <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-5 w-auto" />
                    <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-5 w-auto" />
                    <img src="https://img.icons8.com/color/48/apple-pay.png" alt="Apple Pay" className="h-5 w-auto" />
                  </div>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Lock size={10} className="text-green-600" />
                    256-Bit Encrypted Checkout
                  </p>
                </div>

                <button
                  onClick={closeCart}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
