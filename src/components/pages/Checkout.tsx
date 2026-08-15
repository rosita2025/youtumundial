import { useEffect, useRef, useState } from 'react';
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
import { CreditCard, ShieldCheck, Truck, Tag, X, RotateCcw, Heart, Gem } from 'lucide-react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { createDirectSupOrder } from '@/lib/suppliers/direct-order.functions';
import { createManualOrder } from '@/lib/checkout/manual-order.functions';
import { StripeCartCheckout } from '@/components/StripeCartCheckout';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { ExpressPayButtons } from '@/components/checkout/ExpressPayButtons';
import { detectVisitorGeo } from '@/lib/checkout/geo.functions';

const methods: { id: PaymentMethod; title: string; description: string; icon: typeof CreditCard }[] = [
  {
    id: 'card',
    title: 'Tarjeta de crédito o débito',
    description: 'Visa, Mastercard y Amex. Pago seguro.',
    icon: CreditCard,
  },
];

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [showStripe, setShowStripe] = useState(false);
  const [paying, setPaying] = useState(false);
  const payingRef = useRef(false);
  const freeReferenceRef = useRef<string | null>(null);
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
          <h1 className="font-display text-3xl mb-4 text-foreground">Tu carrito está vacío</h1>
          <Button size="lg" asChild className="mb-12"><Link to="/products">Ver productos</Link></Button>
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

  const handlePay = async (override?: PaymentMethod) => {
    const chosen = override ?? method;
    if (payingRef.current) return;
    if (!validation.ok) {
      setErrors(validation.errors);
      toast.error('Completá tus datos de envío.');
      return;
    }

    if (chosen === 'card') {
      setShowStripe(true);
      return;
    }
  };

  return (
    <CheckoutShell>
      <PaymentTestModeBanner />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="font-medium text-lg mb-4">Express Checkout</h2>
              <ExpressPayButtons
                amount={totals.total}
                countryCode={countryCode}
                disabled={paying}
                onPay={() => { setMethod('card'); void handlePay('card'); }}
              />
              <div className="flex items-center gap-4 my-6"><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground uppercase">o</span><span className="h-px flex-1 bg-border" /></div>
            </section>

            <section>
              <h2 className="font-medium text-lg mb-4">Contacto y entrega</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Nombre" value={customer.firstName} onChange={(e) => updateCustomer('firstName', e.target.value)} />
                <Input placeholder="Apellido" value={customer.lastName} onChange={(e) => updateCustomer('lastName', e.target.value)} />
                <Input placeholder="Correo" className="sm:col-span-2" value={customer.email} onChange={(e) => updateCustomer('email', e.target.value)} />
                <Input placeholder="Teléfono" className="sm:col-span-2" value={customer.phone} onChange={(e) => updateCustomer('phone', e.target.value)} />
                <Input placeholder="Dirección" className="sm:col-span-2" value={customer.address1} onChange={(e) => updateCustomer('address1', e.target.value)} />
                <Input placeholder="Ciudad" value={customer.city} onChange={(e) => updateCustomer('city', e.target.value)} />
                <Input placeholder="Código postal" value={customer.postalCode} onChange={(e) => updateCustomer('postalCode', e.target.value)} />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border p-6 sticky top-24">
              <h2 className="font-medium text-lg mb-4">Tu pedido</h2>
              {/* Order items here */}
              <div className="border-t pt-4 space-y-4">
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatPrice(totals.total)}</span></div>
              </div>
              <Button className="w-full mt-6" size="lg" disabled={missingCustomer || paying || (method === 'card' && showStripe)} onClick={() => void handlePay()}>
                {paying ? 'Procesando…' : 'Pagar ahora'}
              </Button>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-xs"><Truck size={16} className="text-primary" /> <span>Free SG delivery</span></div>
                <div className="flex items-center gap-3 text-xs"><RotateCcw size={16} className="text-primary" /> <span>Easy Returns (7 days)</span></div>
                <div className="flex items-center gap-3 text-xs"><Heart size={16} className="text-primary" /> <span>Money Back Guarantee</span></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </CheckoutShell>
  );
};

export default Checkout;
