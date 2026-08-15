import { Link } from '@/lib/router-compat';
import { Layout } from '@/components/layout/Layout';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { Minus, Plus, X, ShoppingBag, ArrowRight } from 'lucide-react';

const Cart = () => {
  const { cart, updateQuantity, removeItem } = useCart();

  const estimatedTax = cart.subtotal * 0.08; // 8% tax estimate
  const estimatedShipping = cart.subtotal >= 100 ? 0 : 9.99;
  const total = cart.subtotal + estimatedTax + estimatedShipping;

  if (cart.items.length === 0) {
    return (
      <Layout>
        <div className="container-wide py-16 md:py-24">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag size={64} className="mx-auto text-muted-foreground mb-6" />
            <h1 className="font-heading text-3xl font-medium mb-3">
              Your cart is empty
            </h1>
            <p className="text-muted-foreground mb-8">
              Looks like you haven't added anything to your cart yet. 
              Start shopping and discover our collection.
            </p>
            <Button size="lg" asChild>
              <Link to="/products">
                Continue Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-wide py-8 md:py-12">
        <Breadcrumbs items={[{ label: 'Cart' }]} />

        <h1 className="heading-section mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="flex gap-6 pb-6 border-b border-border animate-fade-in"
              >
                <Link
                  to={`/products/${item.product.slug}`}
                  className="shrink-0"
                >
                  <img
                    src={item.product.images[0]?.url}
                    alt={item.product.title}
                    className="w-24 h-32 md:w-32 md:h-40 object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-4">
                    <div>
                      <Link
                        to={`/products/${item.product.slug}`}
                        className="font-medium hover:underline block"
                      >
                        {item.product.title}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.variant.title}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove item"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-4">
                    <div className="flex items-center border border-border rounded-md">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-muted transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-muted transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <p className="font-medium">
                      {formatPrice(item.variant.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-secondary/50 rounded-xl p-6 sticky top-24">
              <h2 className="font-heading text-xl font-medium mb-6">
                Order Summary
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Shipping</span>
                  <span className="font-medium">
                    {estimatedShipping === 0 ? 'Free' : formatPrice(estimatedShipping)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Tax</span>
                  <span className="font-medium">{formatPrice(estimatedTax)}</span>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-medium text-lg">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              {cart.subtotal < 100 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Add {formatPrice(100 - cart.subtotal)} more for free shipping!
                </p>
              )}

              <Button className="w-full mt-6" size="lg" asChild>
                <Link to="/checkout">Ir al checkout</Link>
              </Button>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Secure Global Payments</span>
                  <div className="flex flex-wrap items-center justify-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
                    <img src="https://raw.githubusercontent.com/aayusharyan/payment-icons/refs/heads/master/svg/visa.svg" alt="Visa" className="h-3 w-auto" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 w-auto" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 w-auto" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-5 w-auto" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Pay_Logo_%282020%29.svg" alt="Google Pay" className="h-4 w-auto" />
                  </div>
                </div>
              </div>


              <Link
                to="/products"
                className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
