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
import { composeAddress, emptyCustomer, fullName, toE164, validateCustomer, type CustomerErrors, type CustomerForm } from '@/lib/checkout/customer';
import { CreditCard, ShieldCheck, Truck, Tag, X, RotateCcw, Heart, Gem, ChevronRight, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { createDirectSupOrder } from '@/lib/suppliers/direct-order.functions';
import { StripeCartCheckout } from '@/components/StripeCartCheckout';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { ExpressPayButtons } from '@/components/checkout/ExpressPayButtons';
import { detectVisitorGeo } from '@/lib/checkout/geo.functions';

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
      }
    }).catch(() => {});
  }, [getVisitorGeo]);

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
                <img src="https://cdn.worldvectorlogo.com/logos/visa.svg" alt="Visa" className="h-3 w-auto" />
                <img src="https://cdn.worldvectorlogo.com/logos/mastercard-6.svg" alt="Mastercard" className="h-5 w-auto" />
                <img src="https://cdn.worldvectorlogo.com/logos/paypal-3.svg" alt="PayPal" className="h-4 w-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-5 w-auto" />
                <img src="https://cdn.worldvectorlogo.com/logos/google-pay-2.svg" alt="Google Pay" className="h-4 w-auto" />
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
    if (!validation.ok) {
      setErrors(validation.errors);
      toast.error('Please complete your shipping information.');
      return;
    }
    setShowStripe(true);
  };

  const cartLines = cart.items.map((item) => ({ variantId: String(item.variant.id), quantity: item.quantity }));

  return (
    <CheckoutShell>
      <PaymentTestModeBanner />
      
      {/* Mobile Order Summary Toggle */}
      <div className="lg:hidden border-b border-gray-200 bg-white">
        <button 
          onClick={() => setShowOrderSummary(!showOrderSummary)}
          className="w-full px-4 py-4 flex items-center justify-between text-sm text-blue-600 font-medium"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>{showOrderSummary ? 'Hide summary' : 'Show order summary'}</span>
          </div>
          <span>{formatPrice(totals.total)}</span>
        </button>
        {showOrderSummary && (
          <div className="px-4 py-4 bg-[#FAFAFA] border-t border-gray-200 space-y-4">
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
            <div className="pt-4 border-t border-gray-200 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(totals.discount)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{loadingShipping ? 'Calculating...' : totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Taxes</span><span>{formatPrice(totals.tax)}</span></div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span>{formatPrice(totals.total)}</span></div>
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
                  className="h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
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
                    onChange={(e) => setCountryCode(e.target.value)}
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
                      className="h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                      value={customer.firstName} 
                      onChange={(e) => updateCustomer('firstName', e.target.value)} 
                      aria-invalid={Boolean(errors.firstName)}
                    />
                    {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Input 
                      placeholder="Last name" 
                      className="h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                      value={customer.lastName} 
                      onChange={(e) => updateCustomer('lastName', e.target.value)} 
                      aria-invalid={Boolean(errors.lastName)}
                    />
                    {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                <Input 
                  placeholder="Address" 
                  className="h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                  value={customer.address1} 
                  onChange={(e) => updateCustomer('address1', e.target.value)} 
                  aria-invalid={Boolean(errors.address1)}
                />
                {errors.address1 && <p className="text-xs text-red-500 mt-1">{errors.address1}</p>}

                <Input 
                  placeholder="Apartment, suite, etc. (optional)" 
                  className="h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                  value={customer.address2 ?? ''} 
                  onChange={(e) => updateCustomer('address2', e.target.value)} 
                />

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <Input 
                      placeholder="Postal code" 
                      className="h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                      value={customer.postalCode} 
                      onChange={(e) => updateCustomer('postalCode', e.target.value)} 
                      aria-invalid={Boolean(errors.postalCode)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input 
                      placeholder="City" 
                      className="h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                      value={customer.city} 
                      onChange={(e) => updateCustomer('city', e.target.value)} 
                      aria-invalid={Boolean(errors.city)}
                    />
                  </div>
                </div>

                <div>
                  <Input 
                    placeholder="Phone" 
                    className="h-12 border-gray-300 focus:ring-blue-500 focus:border-blue-500" 
                    value={customer.phone} 
                    onChange={(e) => updateCustomer('phone', e.target.value)} 
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone ? <p className="text-xs text-red-500 mt-1">{errors.phone}</p> : <p className="text-[11px] text-gray-500 mt-1">In case we need to contact you about your order.</p>}
                </div>
              </div>

              {/* Payment Section */}
              <div className="pt-8 space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Payment</h2>
                <p className="text-xs text-gray-500">All transactions are secure and encrypted.</p>
                
                <div className="border border-blue-500 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-4 flex items-center justify-between border-b border-gray-200">
                    <span className="font-medium text-sm text-gray-900">Credit Card</span>
                    <div className="flex gap-1.5 items-center">
                      <img src="https://cdn.worldvectorlogo.com/logos/visa.svg" alt="Visa" className="h-2.5 w-auto" />
                      <img src="https://cdn.worldvectorlogo.com/logos/mastercard-6.svg" alt="Mastercard" className="h-4 w-auto" />
                      <img src="https://cdn.worldvectorlogo.com/logos/american-express-1.svg" alt="Amex" className="h-3 w-auto" />
                      <img src="https://cdn.worldvectorlogo.com/logos/discover-2.svg" alt="Discover" className="h-2.5 w-auto" />
                      <img src="https://cdn.worldvectorlogo.com/logos/paypal-3.svg" alt="PayPal" className="h-3 w-auto" />
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
                        disabled={paying}
                      >
                        Complete details to pay
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
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-4 border-t border-gray-200"><span>Total</span><div className="text-right">
                <span className="text-xs font-normal text-gray-500 mr-2 uppercase tracking-tight">USD</span>
                {formatPrice(totals.total)}
              </div></div>
              {countryCode === 'PE' && <p className="text-[11px] text-gray-400 text-right italic">Approximately S/ {totals.totalPen.toFixed(2)}</p>}
            </div>

            {/* Payment Trust Badges */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Guaranteed Safe Checkout</span>
                <div className="flex flex-wrap items-center justify-center gap-4 opacity-80 grayscale hover:grayscale-0 transition-all duration-300">
                  <img src="https://cdn.worldvectorlogo.com/logos/visa.svg" alt="Visa" className="h-3 w-auto" />
                  <img src="https://cdn.worldvectorlogo.com/logos/mastercard-6.svg" alt="Mastercard" className="h-5 w-auto" />
                  <img src="https://cdn.worldvectorlogo.com/logos/paypal-3.svg" alt="PayPal" className="h-4 w-auto" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-5 w-auto" />
                  <img src="https://cdn.worldvectorlogo.com/logos/google-pay-2.svg" alt="Google Pay" className="h-4 w-auto" />
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
