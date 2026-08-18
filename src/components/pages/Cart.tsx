import { Link } from '@/lib/router-compat';
import { Layout } from '@/components/layout/Layout';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { shippingCountries, shippingCountryFor, FREE_SHIPPING_THRESHOLD } from '@/lib/checkout/config';
import { Minus, Plus, X, ShoppingBag, ArrowRight, Truck, Calculator, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { lookupPostalCode, type PostalPlace } from '@/lib/checkout/address.functions';

const Cart = () => {
  const { cart, updateQuantity, removeItem } = useCart();
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [zipCode, setZipCode] = useState('');
  const [showEstimation, setShowEstimation] = useState(false);
  const [zipPlaces, setZipPlaces] = useState<PostalPlace[]>([]);
  const [lookingUpZip, setLookingUpZip] = useState(false);
  const lookupPostal = useServerFn(lookupPostalCode);

  const countryInfo = shippingCountryFor(selectedCountry);
  const isFreeShipping = cart.subtotal >= FREE_SHIPPING_THRESHOLD;
  
  // Upsell calculation for UI
  const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const differentProducts = new Set(cart.items.map(i => i.productId)).size;
  const isUpsellEligible = totalQuantity >= 2 || differentProducts >= 2;
  const upsellDiscount = isUpsellEligible ? Math.round(cart.subtotal * 0.1 * 100) / 100 : 0;

  const estimatedShipping = isFreeShipping ? 0 : countryInfo.shipping;
  const estimatedTax = (cart.subtotal - upsellDiscount) * 0.08; // 8% tax estimate
  const total = (cart.subtotal - upsellDiscount) + estimatedTax + estimatedShipping;

  useEffect(() => {
    const code = zipCode.trim();
    if (code.length < 3) {
      setZipPlaces([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLookingUpZip(true);
      lookupPostal({ data: { countryCode: selectedCountry, postalCode: code.slice(0, 12) } })
        .then((result) => { if (!cancelled) setZipPlaces(result.places); })
        .catch(() => { if (!cancelled) setZipPlaces([]); })
        .finally(() => { if (!cancelled) setLookingUpZip(false); });
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [zipCode, selectedCountry, lookupPostal]);


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

                {isUpsellEligible && (
                  <div className="flex justify-between text-green-600 animate-in fade-in duration-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles size={14} />
                      Oferta de Pack (10%)
                    </span>
                    <span className="font-bold">-{formatPrice(upsellDiscount)}</span>
                  </div>
                )}

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

              {/* Shipping Estimator */}
              <div className="mt-8 pt-6 border-t border-border">
                <button 
                  onClick={() => setShowEstimation(!showEstimation)}
                  className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Truck size={16} />
                    <span>Estimar envío y entrega</span>
                  </div>
                  <Calculator size={14} className={showEstimation ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>

                {showEstimation && (
                  <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">País / Región</label>
                      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Selecciona un país" />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingCountries.map((c) => (
                            <SelectItem key={c.code} value={c.code} className="text-xs">
                              {c.flag} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Código Postal</label>
                      <Input 
                        placeholder="Ej. 10001" 
                        name="postalCode"
                        autoComplete="postal-code"
                        list="cart-city-options"
                        value={zipCode} 
                        onChange={(e) => setZipCode(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <datalist id="cart-city-options">
                        {zipPlaces.map((place) => (
                          <option key={`${place.city}-${place.state}`} value={zipCode}>
                            {place.state ? `${place.city}, ${place.state}` : place.city}
                          </option>
                        ))}
                      </datalist>
                      {lookingUpZip && (
                        <p className="text-[10px] text-muted-foreground" aria-live="polite">Verificando código postal...</p>
                      )}
                      {!lookingUpZip && zipPlaces.length > 0 && (
                        <p className="text-[10px] text-primary font-medium" aria-live="polite">
                          {zipPlaces[0].state ? `${zipPlaces[0].city}, ${zipPlaces[0].state}` : zipPlaces[0].city}
                        </p>
                      )}
                    </div>


                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-muted-foreground">Costo de envío:</span>
                        <span className="font-bold text-primary">
                          {estimatedShipping === 0 ? 'GRATIS' : formatPrice(estimatedShipping)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Tiempo entrega:</span>
                        <span className="font-medium">{countryInfo.eta}</span>
                      </div>
                      {isFreeShipping && (
                        <p className="text-[10px] text-green-600 font-medium mt-2 flex items-center gap-1">
                          ✨ ¡Envío gratis aplicado!
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!isFreeShipping && (
                <p className="text-[10px] text-muted-foreground mt-4 text-center">
                  Agrega {formatPrice(FREE_SHIPPING_THRESHOLD - cart.subtotal)} más para <strong>envío gratis</strong>
                </p>
              )}

              <Button className="w-full mt-6" size="lg" asChild>
                <Link to="/checkout">Ir al checkout</Link>
              </Button>

              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Secure Global Payments</span>
                  <div className="flex flex-wrap items-center justify-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
                    <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-6 w-auto" />
                    <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-6 w-auto" />
                    <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-6 w-auto" />
                    <img src="https://img.icons8.com/color/48/apple-pay.png" alt="Apple Pay" className="h-6 w-auto" />
                    <img src="https://img.icons8.com/color/48/google-pay.png" alt="Google Pay" className="h-6 w-auto" />
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