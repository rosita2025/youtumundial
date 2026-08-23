import { useEffect, useRef, useState } from 'react';
import { fbEvent } from '@/lib/facebook-pixel';
import { Link, useNavigate } from '@/lib/router-compat';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { checkoutConfig, shippingCountries, shippingCountryFor } from '@/lib/checkout/config';
import { buildWhatsappOrderLink, getTotals, type PaymentMethod } from '@/lib/checkout/order';
import { type Coupon } from '@/lib/checkout/coupons';
import { validateCoupon } from '@/lib/checkout/coupon.functions';
import { getShippingQuote, type ShippingQuoteResult } from '@/lib/checkout/shipping.functions';
import { saveAbandonedCheckout, clearAbandonedCheckout } from '@/lib/checkout/abandoned.functions';
import { composeAddress, emptyCustomer, fullName, toE164, validateCustomer, getDialingPrefix, type CustomerErrors, type CustomerForm } from '@/lib/checkout/customer';
import { CreditCard, ShieldCheck, Truck, Tag, X, RotateCcw, Heart, Gem, ChevronRight, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { createDirectSupOrder } from '@/lib/suppliers/direct-order.functions';
import { StripeCartCheckout } from '@/components/StripeCartCheckout';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { ExpressPayButtons } from '@/components/checkout/ExpressPayButtons';
import { detectVisitorGeo } from '@/lib/checkout/geo.functions';
import { lookupPostalCode, type PostalPlace } from '@/lib/checkout/address.functions';

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const [method] = useState<PaymentMethod>('card');
  const [showStripe, setShowStripe] = useState(false);
  const [paying, setPaying] = useState(false);
  const payingRef = useRef(false);
  const createSupOrder = useServerFn(createDirectSupOrder);
  const checkCoupon = useServerFn(validateCoupon);
  const fetchShipping = useServerFn(getShippingQuote);
  const saveAbandoned = useServerFn(saveAbandonedCheckout);
  const clearAbandoned = useServerFn(clearAbandonedCheckout);
  const getVisitorGeo = useServerFn(detectVisitorGeo);
  const lookupPostal = useServerFn(lookupPostalCode);
  const abandonedRef = useRef<string | null>(null);
  const geoDetectedRef = useRef(false);

  const [countryCode, setCountryCode] = useState('PE');
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuoteResult | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<PostalPlace[]>([]);
  const [lookingUpPostal, setLookingUpPostal] = useState(false);
  const lastScrollY = useRef(0);

  // Auto-hide order summary on scroll (Shopify behavior)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If we are scrolling down and the summary is open, hide it
      if (showOrderSummary && currentScrollY > 100 && currentScrollY > lastScrollY.current) {
        setShowOrderSummary(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showOrderSummary]);

  const customerData: CustomerForm = { ...customer, countryCode };
  const addressLine = composeAddress(customerData);
  const country = shippingCountryFor(countryCode);
  const baseTotals = getTotals(cart, country, coupon);
  
  const liveShipping = coupon?.freeShipping || baseTotals.shipping === 0 ? 0 : (shippingQuote?.amount ?? baseTotals.shipping);
  const totalWithShipping = Math.round((baseTotals.subtotal - baseTotals.discount + liveShipping) * 100) / 100;
  const totals = {
    ...baseTotals,
    shipping: liveShipping,
    total: Math.max(0, totalWithShipping),
    totalPen: Math.round(Math.max(0, totalWithShipping) * checkoutConfig.usdToPen * 100) / 100,
    tax: 0, // In many Shopify checkouts, tax is calculated later or included
  };

  const shippingKey = cart.items.map((i) => `${i.variant.id}x${i.quantity}`).join(',');

  useEffect(() => {
    if (geoDetectedRef.current) return;
    geoDetectedRef.current = true;
    getVisitorGeo().then((geo) => {
      if (geo.countryCode && shippingCountryFor(geo.countryCode).code === geo.countryCode) {
        setCountryCode(geo.countryCode);
        
        // Auto-fill phone prefix if empty
        const prefix = getDialingPrefix(geo.countryCode);
        setCustomer(prev => {
          if (!prev.phone || prev.phone.trim() === '') {
            return { ...prev, phone: prefix ? `${prefix} ` : '' };
          }
          return prev;
        });
      }
    }).catch(() => {});
  }, [getVisitorGeo]);

  // Countries where the courier requires a state/province
  const provinceRequired = countryCode === 'US' || countryCode === 'CA';

  // Address autocomplete: resolve city/state from postal code (reduces typing errors)
  useEffect(() => {
    const code = customer.postalCode.trim();
    if (code.length < 3) {
      setCitySuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLookingUpPostal(true);
      lookupPostal({ data: { countryCode, postalCode: code.slice(0, 12) } })
        .then((result) => {
          if (cancelled) return;
          setCitySuggestions(result.places);
          if (result.places.length > 0) {
            const best = result.places[0];
            setCustomer((prev) => {
              const next = { ...prev };
              if (!prev.city.trim()) next.city = best.city;
              if (!String(prev.province ?? '').trim() && best.state) next.province = best.state;
              return next;
            });
            setErrors((prev) => ({ ...prev, city: undefined, province: undefined }));
          }
        })
        .catch(() => { if (!cancelled) setCitySuggestions([]); })
        .finally(() => { if (!cancelled) setLookingUpPostal(false); });
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [customer.postalCode, countryCode, lookupPostal]);





  useEffect(() => {
    if (cart.items.length > 0) {
      fbEvent.track('InitiateCheckout', {
        content_ids: cart.items.map(i => i.product.id),
        content_type: 'product',
        value: totals.subtotal,
        currency: 'USD',
        num_items: cart.items.reduce((acc, i) => acc + i.quantity, 0)
      });
    }
  }, []);

  useEffect(() => {
    if (!shippingKey) return;
    let cancelled = false;
    setLoadingShipping(true);
    fetchShipping({
      data: {
        items: cart.items.map((i) => ({ variantId: String(i.variant.id), quantity: i.quantity })),
        countryCode,
        subtotal: cart.subtotal,
      },
    }).then((quote) => { if (!cancelled) setShippingQuote(quote); })
      .catch(() => { if (!cancelled) setShippingQuote(null); })
      .finally(() => { if (!cancelled) setLoadingShipping(false); });
    return () => { cancelled = true; };
  }, [shippingKey, countryCode, cart.subtotal]);

  useEffect(() => {
    if (paying || cart.items.length === 0) return;
    const email = customer.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return;

    if (!abandonedRef.current) {
      const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('ytm-abandoned-ref') : null;
      const reference = stored || `ABND-${Date.now()}`;
      abandonedRef.current = reference;
      if (typeof window !== 'undefined') window.sessionStorage.setItem('ytm-abandoned-ref', reference);
    }
    const reference = abandonedRef.current;
    const timer = window.setTimeout(() => {
      saveAbandoned({
        data: {
          reference,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          countryCode,
          address: addressLine,
          address1: customer.address1,
          address2: customer.address2,
          city: customer.city,
          province: customer.province,
          postalCode: customer.postalCode,
          couponCode: coupon?.code,
          items: cart.items.map((i) => ({ variantId: String(i.variant.id), quantity: i.quantity })),
        },
      }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [customer.firstName, customer.lastName, customer.email, customer.phone, addressLine, countryCode, cart.items.length, coupon?.code, paying]);

  if (cart.items.length === 0) {
    return (
      <CheckoutShell>
        <div className="container mx-auto px-4 py-24 text-center max-w-lg">
          <h1 className="font-display text-3xl mb-4 text-foreground">Your cart is empty</h1>
          <Button size="lg" asChild className="mb-12"><Link to="/products">View products</Link></Button>

          {/* Payment Trust Badges for empty cart to build trust */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Secure Global Payments</span>
              <div className="flex flex-wrap items-center justify-center gap-6 opacity-60 grayscale">
                <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-6 w-auto" />
                <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-6 w-auto" />
                <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-6 w-auto" />
                <img src="https://img.icons8.com/color/48/apple-pay.png" alt="Apple Pay" className="h-6 w-auto" />
                <img src="https://img.icons8.com/color/48/google-pay.png" alt="Google Pay" className="h-6 w-auto" />
              </div>
            </div>
          </div>
        </div>
      </CheckoutShell>
    );
  }

  const validation = validateCustomer(customerData);
  const missingCustomer = !validation.ok;
  const customerName = fullName(customer);
  const customerPhone = toE164(customer.phone);

  const updateCustomer = (field: keyof CustomerForm, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setShowStripe(false);
  };

  const applyCoupon = async () => {
    if (!couponInput.trim()) { toast.error('Enter a discount code.'); return; }
    try {
      const result = await checkCoupon({ data: { code: couponInput, subtotal: cart.subtotal } });
      if (!result.ok || !result.coupon) { toast.error(result.message ?? 'This coupon does not exist.'); return; }
      setCoupon(result.coupon);
      setShowStripe(false);
      toast.success(`Coupon applied: ${result.coupon.label}`);
    } catch { toast.error('Could not validate coupon.'); }
  };

  const removeCoupon = () => { setCoupon(null); setCouponInput(''); setShowStripe(false); };

  const handlePay = async () => {
    if (payingRef.current) return;
    
    const validation = validateCustomer(customerData);
    if (!validation.ok) {
      setErrors(validation.errors);
      const messages = Object.values(validation.errors).filter(Boolean) as string[];
      toast.error('Please review your shipping details.', {
        description: messages.slice(0, 3).join(' '),
        duration: 3500,
      });

      // Focus/scroll to the first field that actually failed (if it is rendered)
      const firstError = Object.keys(validation.errors)[0];
      const element = firstError
        ? (document.getElementsByName(firstError)[0] as HTMLElement | undefined)
        : undefined;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (element as HTMLInputElement).focus?.({ preventScroll: true });
      }
      return;
    }


    setPaying(true);
    payingRef.current = true;
    
    // Feedback visual y scroll suave al área de pago
    setTimeout(() => {
      setShowStripe(true);
      setPaying(false);
      payingRef.current = false;
      
      // Scroll automático al widget de Stripe para que el cliente vea el pago de inmediato
      const stripeWidget = document.getElementById('checkout');
      if (stripeWidget) {
        stripeWidget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 400);
  };

  const cartLines = cart.items.map((item) => ({ variantId: String(item.variant.id), quantity: item.quantity }));

  return (
    <CheckoutShell>
      <PaymentTestModeBanner />
      
      {/* Mobile Order Summary Toggle */}
      <div className="lg:hidden border-b border-gray-200 bg-white sticky top-0 z-50">
        <button 
          onClick={() => setShowOrderSummary(!showOrderSummary)}
          className="w-full px-4 py-4 flex items-center justify-between text-sm text-blue-600 font-medium"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>{showOrderSummary ? 'Hide order summary' : 'Show order summary'}</span>
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showOrderSummary ? 'rotate-90' : ''}`} />
          </div>
          <span className="text-gray-900">{formatPrice(totals.total)}</span>
        </button>
        {showOrderSummary && (
          <div className="px-4 py-6 bg-[#FAFAFA] border-t border-gray-200 space-y-6 animate-in slide-in-from-top-4 duration-200">
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative h-16 w-16 bg-white border border-gray-200 rounded-md overflow-hidden shrink-0">
                    <img src={item.product.images[0]?.url} alt={item.product.title} className="h-full w-full object-cover" />
                    <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full border border-white font-bold">{item.quantity}</span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-gray-900">{item.product.title}</p>
                    <p className="text-gray-500 text-xs">{item.variant.title}</p>
                  </div>
                  <div className="text-sm font-medium">{formatPrice(item.variant.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 py-4 border-t border-b border-gray-200">
              <Input 
                placeholder="Discount code" 
                className="h-11 border-gray-300 bg-white" 
                value={couponInput} 
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())} 
              />
              <Button onClick={applyCoupon} variant="secondary" className="h-11 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors">Apply</Button>
            </div>

            <div className="space-y-2 text-sm pt-2">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(totals.discount)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{loadingShipping ? 'Calculating...' : totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Taxes</span><span>{formatPrice(totals.tax)}</span></div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-4 border-t border-gray-200"><span>Total</span><div className="flex items-center gap-2"><span className="text-xs font-normal text-gray-400">USD</span>{formatPrice(totals.total)}</div></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px]">
        {/* Left Column: Form */}
        <div className="bg-white lg:min-h-screen px-4 py-8 lg:px-12 lg:py-16 lg:border-r lg:border-gray-200">
          <div className="max-w-xl ml-auto">
            {/* Express Checkout */}
            <section className="mb-10">
              <h2 className="text-center text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Express Checkout</h2>
              <ExpressPayButtons
                amount={totals.total}
                countryCode={countryCode}
                disabled={paying}
                onPay={() => { setShowStripe(true); }}
              />
              <div className="relative my-8 text-center">
                <hr className="border-gray-200" />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs font-medium text-gray-400 uppercase">OR</span>
              </div>
            </section>

            {/* Contact Info */}
            <section className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-medium text-gray-900">Contact</h2>
                  <span className="text-xs text-muted-foreground italic">Already have an account? Log in (Coming soon)</span>
                </div>
                <Input 
                  placeholder="Email" 
                  type="email"
                  required
                  className={`h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500 ring-1 ring-red-500' : ''}`} 
                  value={customer.email} 
                  onChange={(e) => updateCustomer('email', e.target.value)} 
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Shipping Address */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Delivery</h2>
                
                <div className="mb-4">
                  <Label htmlFor="country" className="sr-only">Country/Region</Label>
                  <select
                    id="country"
                    value={countryCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setCountryCode(newCode);
                      
                      // Update phone prefix if current phone is just a prefix or empty
                      const oldPrefix = getDialingPrefix(countryCode);
                      const newPrefix = getDialingPrefix(newCode);
                      
                      setCustomer(prev => {
                        const currentPhone = prev.phone.trim();
                        if (!currentPhone || currentPhone === oldPrefix || currentPhone === oldPrefix.trim()) {
                          return { ...prev, phone: newPrefix ? `${newPrefix} ` : '' };
                        }
                        return prev;
                      });
                    }}
                    className="w-full h-12 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {shippingCountries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input 
                      placeholder="First name" 
                      required
                      className={`h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${errors.firstName ? 'border-red-500 ring-1 ring-red-500' : ''}`} 
                      value={customer.firstName} 
                      onChange={(e) => updateCustomer('firstName', e.target.value)} 
                      aria-invalid={Boolean(errors.firstName)}
                    />
                    {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Input 
                      placeholder="Last name" 
                      required
                      className={`h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${errors.lastName ? 'border-red-500 ring-1 ring-red-500' : ''}`} 
                      value={customer.lastName} 
                      onChange={(e) => updateCustomer('lastName', e.target.value)} 
                      aria-invalid={Boolean(errors.lastName)}
                    />
                    {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <Input 
                  placeholder="Address" 
                  required
                  name="address1"
                  autoComplete="address-line1"
                  className={`h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${errors.address1 ? 'border-red-500 ring-1 ring-red-500' : ''}`} 
                  value={customer.address1} 
                  onChange={(e) => updateCustomer('address1', e.target.value)} 
                  aria-invalid={Boolean(errors.address1)}
                />
                {errors.address1 && <p className="text-xs text-red-500 mt-1">{errors.address1}</p>}

                <Input 
                  placeholder="Apartment, suite, etc. (optional)" 
                  name="address2"
                  autoComplete="address-line2"
                  className="h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                  value={customer.address2 ?? ''} 
                  onChange={(e) => updateCustomer('address2', e.target.value)} 
                />

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <Input 
                      placeholder="Postal code" 
                      required
                      name="postalCode"
                      autoComplete="postal-code"
                      inputMode="text"
                      className={`h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${errors.postalCode ? 'border-red-500 ring-1 ring-red-500' : ''}`} 
                      value={customer.postalCode} 
                      onChange={(e) => updateCustomer('postalCode', e.target.value)} 
                      aria-invalid={Boolean(errors.postalCode)}
                    />
                    {errors.postalCode && <p className="text-[10px] text-red-500 mt-1">{errors.postalCode}</p>}
                  </div>
                  <div className="col-span-1">
                    <Input 
                      placeholder="City" 
                      required
                      name="city"
                      autoComplete="address-level2"
                      list="checkout-city-options"
                      className={`h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${errors.city ? 'border-red-500 ring-1 ring-red-500' : ''}`} 
                      value={customer.city} 
                      onChange={(e) => updateCustomer('city', e.target.value)} 
                      aria-invalid={Boolean(errors.city)}
                    />
                    <datalist id="checkout-city-options">
                      {citySuggestions.map((place) => (
                        <option key={`${place.city}-${place.state}`} value={place.city}>
                          {place.state ? `${place.city}, ${place.state}` : place.city}
                        </option>
                      ))}
                    </datalist>
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </div>
                  <div className="col-span-1">
                    <Input
                      placeholder={provinceRequired ? (countryCode === 'CA' ? 'Province' : 'State') : 'State / Province (optional)'}
                      required={provinceRequired}
                      name="province"
                      autoComplete="address-level1"
                      list="checkout-province-options"
                      className={`h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${errors.province ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      value={customer.province ?? ''}
                      onChange={(e) => updateCustomer('province', e.target.value)}
                      aria-invalid={Boolean(errors.province)}
                    />
                    <datalist id="checkout-province-options">
                      {Array.from(new Set(citySuggestions.map((p) => p.state).filter(Boolean))).map((state) => (
                        <option key={state} value={state as string} />
                      ))}
                    </datalist>
                    {errors.province && <p className="text-[10px] text-red-500 mt-1">{errors.province}</p>}
                  </div>
                </div>


                {lookingUpPostal && (
                  <p className="flex items-center gap-2 text-xs text-gray-500" aria-live="polite">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Looking up your postal code...
                  </p>
                )}

                {!lookingUpPostal && citySuggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2" aria-live="polite">
                    <span className="text-xs text-gray-500">Suggestions:</span>
                    {citySuggestions.map((place) => (
                      <button
                        key={`chip-${place.city}-${place.state}`}
                        type="button"
                        onClick={() => updateCustomer('city', place.city)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          customer.city.trim().toLowerCase() === place.city.toLowerCase()
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {place.state ? `${place.city}, ${place.state}` : place.city}
                      </button>
                    ))}
                  </div>
                )}


                {/* Shipping Estimator & Timeframe Display */}
                <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-3">
                    <Truck className="h-4 w-4" />
                    Delivery Estimate
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-start text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-700">Preparation Time</span>
                        <span className="text-gray-500 italic">Handling and packing</span>
                      </div>
                      <span className="font-bold text-blue-700">3-4 business days</span>
                    </div>

                    <div className="flex justify-between items-start text-xs pt-2 border-t border-blue-100">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-700">Shipping Time</span>
                        <span className="text-gray-500 italic">Transit to your address</span>
                      </div>
                      <span className="font-bold text-blue-700">{country.eta}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2 border-t border-blue-100">
                      <span className="font-medium text-gray-700">Shipping Cost</span>
                      <span className="font-bold text-gray-900">
                        {loadingShipping ? (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Calculating...
                          </span>
                        ) : totals.shipping === 0 ? (
                          <span className="text-green-600">Free</span>
                        ) : (
                          formatPrice(totals.shipping)
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <p className="mt-3 text-[10px] text-blue-600/80 leading-tight">
                    * Times are estimates and may vary slightly depending on your specific location and local courier service.
                  </p>
                </div>

                <div>
                  <Input 
                    placeholder="Phone" 
                    type="tel"
                    required
                    className={`h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${errors.phone ? 'border-red-500 ring-1 ring-red-500' : ''}`} 
                    value={customer.phone} 
                    onChange={(e) => updateCustomer('phone', e.target.value)} 
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone ? <p className="text-xs text-red-500 mt-1">{errors.phone}</p> : <p className="text-[11px] text-gray-500 mt-1">Required for delivery coordination and shipping notifications.</p>}
                </div>
              </div>

              {/* Payment Section */}
              <div className="pt-8 space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Payment</h2>
                <p className="text-xs text-gray-500">All transactions are secure and encrypted.</p>
                
                <div className="border border-blue-500 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-4 flex items-center justify-between border-b border-gray-200">
                    <span className="font-medium text-sm text-gray-900">Credit Card</span>
                    <div className="flex gap-2 items-center">
                      <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-6 w-auto" />
                      <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-6 w-auto" />
                      <img src="https://img.icons8.com/color/48/amex.png" alt="Amex" className="h-6 w-auto" />
                      <img src="https://img.icons8.com/color/48/discover.png" alt="Discover" className="h-6 w-auto" />
                      <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-6 w-auto" />
                      <img src="https://img.icons8.com/color/48/google-pay.png" alt="Google Pay" className="h-6 w-auto" />
                      <img src="https://img.icons8.com/color/48/apple-pay.png" alt="Apple Pay" className="h-6 w-auto" />
                    </div>
                  </div>
                  <div className="p-4 bg-white">
                    {showStripe ? (
                      <StripeCartCheckout
                        items={cartLines}
                        countryCode={countryCode}
                        couponCode={coupon?.code}
                        customerEmail={customer.email}
                        customerName={customerName}
                        customerPhone={customerPhone}
                        abandonedReference={abandonedRef.current ?? undefined}
                        returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
                      />
                    ) : (
                      <Button 
                        onClick={handlePay} 
                        className="w-full h-14 bg-[#111111] hover:bg-black text-white font-bold text-base transition-colors"
                        disabled={paying || loadingShipping}
                      >
                        {paying ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Preparando pago seguro...
                          </span>
                        ) : (
                          'Confirmar y Pagar'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="hidden lg:block bg-[#FAFAFA] min-h-screen px-4 py-8 lg:px-12 lg:py-16">
          <div className="max-w-md">
            <div className="space-y-6">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="relative h-16 w-16 bg-white border border-gray-200 rounded-md overflow-hidden shrink-0">
                    <img src={item.product.images[0]?.url} alt={item.product.title} className="h-full w-full object-cover" />
                    <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full border border-white font-bold">{item.quantity}</span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-gray-900">{item.product.title}</p>
                    <p className="text-gray-500 text-xs">{item.variant.title}</p>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{formatPrice(item.variant.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex gap-2">
                <Input 
                  placeholder="Discount code" 
                  className="h-11 border-gray-300 bg-white" 
                  value={couponInput} 
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())} 
                />
                <Button onClick={applyCoupon} variant="secondary" className="h-11 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors">Apply</Button>
              </div>
              {coupon && (
                <div className="mt-2 flex items-center justify-between bg-blue-50 px-3 py-2 rounded text-xs text-blue-700">
                  <span className="flex items-center gap-1.5"><Tag size={12} /> {coupon.code} ({coupon.label})</span>
                  <button onClick={removeCoupon} className="text-blue-500 hover:text-blue-700"><X size={14} /></button>
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-medium text-gray-900">{formatPrice(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(totals.discount)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span className="font-medium text-gray-900">
                {loadingShipping ? <Loader2 className="h-3 w-3 animate-spin inline" /> : totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}
              </span></div>
              <div className="flex justify-between text-gray-600"><span>Estimated taxes</span><span className="font-medium text-gray-900">{formatPrice(totals.tax)}</span></div>
              
              <div className="flex justify-between items-baseline pt-4 border-t border-gray-200">
                <span className="text-base font-bold text-gray-900">Total</span>
                <div className="text-right flex items-baseline gap-2">
                  <span className="text-xs font-normal text-gray-500 uppercase tracking-tight">USD</span>
                  <span className="text-2xl font-bold text-gray-900">{formatPrice(totals.total)}</span>
                </div>
              </div>
              {countryCode === 'PE' && <p className="text-[11px] text-gray-400 text-right italic">Approximately S/ {totals.totalPen.toFixed(2)}</p>}
            </div>

            {/* Payment Trust Badges */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Guaranteed Safe Checkout</span>
                <div className="flex flex-wrap items-center justify-center gap-4 opacity-80 grayscale hover:grayscale-0 transition-all duration-300">
                  <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-6 w-auto" />
                  <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-6 w-auto" />
                  <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-6 w-auto" />
                  <img src="https://img.icons8.com/color/48/apple-pay.png" alt="Apple Pay" className="h-6 w-auto" />
                  <img src="https://img.icons8.com/color/48/google-pay.png" alt="Google Pay" className="h-6 w-auto" />
                  <div className="flex items-center gap-1 text-gray-400">
                    <ShieldCheck size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Secure SSL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Markers */}
            <div className="mt-12 grid grid-cols-2 gap-y-8 gap-x-4">
              <div className="flex flex-col items-center text-center space-y-2 group">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm transition-transform group-hover:scale-105"><Truck size={22} className="text-gray-700" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Global delivery</span>
                <span className="text-[9px] text-gray-400 -mt-1">Free to Singapore</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2 group">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm transition-transform group-hover:scale-105"><RotateCcw size={22} className="text-gray-700" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">7-Day Returns</span>
                <span className="text-[9px] text-gray-400 -mt-1">Full refund</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2 group">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm transition-transform group-hover:scale-105"><ShieldCheck size={22} className="text-gray-700" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Money Back</span>
                <span className="text-[9px] text-gray-400 -mt-1">100% Guaranteed</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2 group">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm transition-transform group-hover:scale-105"><Gem size={22} className="text-gray-700" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Premium Quality</span>
                <span className="text-[9px] text-gray-400 -mt-1">Built-in comfort</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CheckoutShell>
  );
};

export default Checkout;
