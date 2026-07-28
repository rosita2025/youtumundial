import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { checkoutConfig, shippingCountries } from '@/lib/checkout/config';
import {
  
  buildWhatsappOrderLink,
  getTotals,
  type PaymentMethod,
} from '@/lib/checkout/order';
import { type Coupon } from '@/lib/checkout/coupons';
import { validateCoupon } from '@/lib/checkout/coupon.functions';
import { getShippingQuote, type ShippingQuoteResult } from '@/lib/checkout/shipping.functions';
import {
  saveAbandonedCheckout,
  clearAbandonedCheckout,
} from '@/lib/checkout/abandoned.functions';
import {
  composeAddress,
  emptyCustomer,
  fullName,
  toE164,
  validateCustomer,
  type CustomerErrors,
  type CustomerForm,
} from '@/lib/checkout/customer';

import { CreditCard, ShieldCheck, Truck, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { createDirectSupOrder } from '@/lib/suppliers/direct-order.functions';
import { createManualOrder } from '@/lib/checkout/manual-order.functions';

import { StripeCartCheckout } from '@/components/StripeCartCheckout';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';


const methods: { id: PaymentMethod; title: string; description: string; icon: typeof CreditCard }[] = [
  {
    id: 'card',
    title: 'Tarjeta de crédito o débito',
    description: 'Visa, Mastercard y Amex de Perú, EE.UU., Canadá y Reino Unido. Pago seguro en la misma página.',
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
  const manualReferenceRef = useRef<string | null>(null);
  const createSupOrder = useServerFn(createDirectSupOrder);
  const createManual = useServerFn(createManualOrder);
  const checkCoupon = useServerFn(validateCoupon);
  const fetchShipping = useServerFn(getShippingQuote);
  const saveAbandoned = useServerFn(saveAbandonedCheckout);
  const clearAbandoned = useServerFn(clearAbandonedCheckout);
  const abandonedRef = useRef<string | null>(null);


  const [countryCode, setCountryCode] = useState(shippingCountries[0].code);
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [errors, setErrors] = useState<CustomerErrors>({});

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);

  const [shippingQuote, setShippingQuote] = useState<ShippingQuoteResult | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // El país siempre viaja dentro de los datos validados: así el esquema puede
  // exigir estado/provincia y código postal correctos según el destino.
  const customerData: CustomerForm = { ...customer, countryCode };
  const addressLine = composeAddress(customerData);

  const country = shippingCountries.find((c) => c.code === countryCode) ?? shippingCountries[0];
  const baseTotals = getTotals(cart, country, coupon);
  // El envío internacional (EE.UU., Canadá y demás destinos) se sincroniza con
  // los perfiles de envío de Shopify; el servidor vuelve a validarlo al cobrar.
  const liveShipping =
    coupon?.freeShipping || baseTotals.shipping === 0
      ? 0
      : (shippingQuote?.amount ?? baseTotals.shipping);
  const totalWithShipping =
    Math.round((baseTotals.subtotal - baseTotals.discount + liveShipping) * 100) / 100;
  const totals = {
    ...baseTotals,
    shipping: liveShipping,
    total: Math.max(0, totalWithShipping),
    totalPen: Math.round(Math.max(0, totalWithShipping) * checkoutConfig.usdToPen * 100) / 100,
  };

  const shippingKey = cart.items
    .map((i) => `${i.variant.id}x${i.quantity}`)
    .join(',');

  useEffect(() => {
    if (!shippingKey) return;
    let cancelled = false;
    setLoadingShipping(true);
    fetchShipping({
      data: {
        items: cart.items.map((i) => ({
          variantId: String(i.variant.id),
          quantity: i.quantity,
        })),
        countryCode,
        subtotal: cart.subtotal,
      },
    })
      .then((quote) => {
        if (!cancelled) setShippingQuote(quote);
      })
      .catch(() => {
        if (!cancelled) setShippingQuote(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingShipping(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingKey, countryCode, cart.subtotal]);

  // Carrito abandonado → Shopify.
  // En cuanto el correo es válido guardamos el checkout en Shopify como
  // borrador etiquetado "carrito-abandonado" (aunque falten datos), y lo
  // vamos actualizando conforme el cliente completa nombre, teléfono y
  // dirección. Si cambia de correo, se actualiza el mismo borrador.
  useEffect(() => {
    if (paying) return;
    if (cart.items.length === 0) return;
    const email = customer.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return;

    if (!abandonedRef.current) {
      const stored =
        typeof window !== 'undefined' ? window.sessionStorage.getItem('ytm-abandoned-ref') : null;
      const reference = stored || `ABND-${Date.now()}`;
      abandonedRef.current = reference;
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('ytm-abandoned-ref', reference);
      }
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
          items: cart.items.map((i) => ({
            variantId: String(i.variant.id),
            quantity: i.quantity,
          })),
        },
      }).catch(() => {
        // Silencioso: nunca debe molestar al cliente que está comprando.
      });
    }, 2500);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customer.firstName,
    customer.lastName,
    customer.email,
    customer.phone,
    addressLine,
    countryCode,
    cart.items.length,
    coupon?.code,
    paying,
  ]);


  if (cart.items.length === 0) {
    return (
      <CheckoutShell>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-3xl mb-4">Tu carrito está vacío</h1>
          <p className="text-muted-foreground mb-8">Agregá prendas antes de pasar por caja.</p>
          <Button size="lg" asChild>
            <Link to="/products">Ver productos</Link>
          </Button>
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

  const isFreeOrder = totals.total < 0.5;

  const applyCoupon = async () => {
    if (!couponInput.trim()) {
      toast.error('Escribí un código de cupón.');
      return;
    }
    try {
      // El cupón se valida en el servidor: los códigos privados no viajan al navegador.
      const result = await checkCoupon({
        data: { code: couponInput, subtotal: cart.subtotal },
      });
      if (!result.ok || !result.coupon) {
        toast.error(result.message ?? 'Ese cupón no existe o ya venció.');
        return;
      }
      setCoupon(result.coupon);
      setShowStripe(false);
      toast.success(`Cupón aplicado: ${result.coupon.label}`);
    } catch {
      toast.error('No pudimos validar el cupón. Probá de nuevo.');
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput('');
    setShowStripe(false);
  };

  // El navegador solo manda variante + cantidad: el precio, el descuento y el
  // envío se recalculan en el servidor con el catálogo real.
  const cartLines = cart.items.map((item) => ({
    variantId: String(item.variant.id),
    quantity: item.quantity,
  }));

  const handlePay = async (override?: PaymentMethod) => {
    const chosen = override ?? method;
    // Un solo envío por click: evita pedidos duplicados si se toca dos veces.
    if (payingRef.current) return;
    if (!validation.ok) {
      setErrors(validation.errors);
      toast.error('Completá todos tus datos de envío para continuar.');
      return;
    }

    if (isFreeOrder) {
      // Referencia estable por intento: si se reintenta, el servidor la
      // reconoce y no crea un segundo pedido en Shopify.
      if (!freeReferenceRef.current) freeReferenceRef.current = `YTM-${Date.now()}`;
      const reference = freeReferenceRef.current;
      let freeOrderNumber: string | undefined;
      payingRef.current = true;
      setPaying(true);
      try {
        // Número visible del pedido en Shopify, para mostrarlo al cliente.
        const result = await createSupOrder({
          data: {
            reference,
            name: customerName,
            email: customer.email,
            phone: customerPhone,
            countryCode,
            address: addressLine,

            couponCode: coupon?.code,
            abandonedReference: abandonedRef.current ?? undefined,
            items: cartLines,
          },
        });
        if (!result.ok) {
          toast.error(result.message ?? 'No se pudo registrar el pedido.');
          payingRef.current = false;
          setPaying(false);
          return;
        }
        freeOrderNumber = result.shopifyOrderNumber;
        if (result.pending) {
          toast.success('¡Gracias por tu compra! Pedido registrado, lo confirmamos en breve.');
        } else {
          toast.success('¡Gracias por tu compra! Pedido confirmado con tu cupón.');
        }
      } catch (e) {
        toast.error((e as Error).message);
        payingRef.current = false;
        setPaying(false);
        return;
      }

      const finishedRef = abandonedRef.current;
      if (finishedRef) {
        clearAbandoned({ data: { reference: finishedRef } }).catch(() => {});
        abandonedRef.current = null;
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('ytm-abandoned-ref');
        }
      }
      clearCart();
      navigate(
        freeOrderNumber
          ? `/checkout/return?free=1&order=${encodeURIComponent(freeOrderNumber)}`
          : '/checkout/return?free=1',
      );
      return;
    }



    if (chosen === 'card') {
      setShowStripe(true);
      return;
    }




    toast.error('Ese método aún no está configurado. Escribinos por WhatsApp y cerramos el pedido.');
    window.open(
      buildWhatsappOrderLink(cart, country, totals, {
        name: customerName,
        email: customer.email,
        phone: customerPhone,
        address: addressLine,
      }),
      '_blank',
      'noopener,noreferrer',
    );
  };


  return (
    <CheckoutShell>
      <PaymentTestModeBanner />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <section className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Pago exprés</p>
              <ExpressPayButtons
                amount={totals.total}
                countryCode={countryCode}
                disabled={loading}
                onPay={() => {
                  setMethod('card');
                  void handlePay('card');
                }}
              />

              <div className="flex items-center gap-4 my-6">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground uppercase">o</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </section>

            <section>
              <h2 className="font-medium text-lg mb-4">Contacto y entrega</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    maxLength={60}
                    value={customer.firstName}
                    onChange={(e) => updateCustomer('firstName', e.target.value)}
                    onBlur={() => setErrors(validateCustomer(customer).errors)}
                    aria-invalid={Boolean(errors.firstName)}
                    placeholder="Ana"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido *</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    maxLength={60}
                    value={customer.lastName}
                    onChange={(e) => updateCustomer('lastName', e.target.value)}
                    onBlur={() => setErrors(validateCustomer(customer).errors)}
                    aria-invalid={Boolean(errors.lastName)}
                    placeholder="Pérez"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    maxLength={160}
                    value={customer.email}
                    onChange={(e) => updateCustomer('email', e.target.value)}
                    onBlur={() => setErrors(validateCustomer(customer).errors)}
                    aria-invalid={Boolean(errors.email)}
                    placeholder="ana@email.com"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono (con código de país) *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={25}
                    value={customer.phone}
                    onChange={(e) => updateCustomer('phone', e.target.value)}
                    onBlur={() => setErrors(validateCustomer(customer).errors)}
                    aria-invalid={Boolean(errors.phone)}
                    placeholder="+51 987 654 321"
                  />
                  {errors.phone ? (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Lo usamos para coordinar la entrega con el courier.
                    </p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address1">Dirección (calle y número) *</Label>
                  <Input
                    id="address1"
                    autoComplete="address-line1"
                    maxLength={200}
                    value={customer.address1}
                    onChange={(e) => updateCustomer('address1', e.target.value)}
                    onBlur={() => setErrors(validateCustomer(customerData).errors)}
                    aria-invalid={Boolean(errors.address1)}
                    placeholder="Av. Siempre Viva 742"
                  />
                  {errors.address1 && (
                    <p className="text-xs text-destructive">{errors.address1}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address2">Departamento, piso, referencia (opcional)</Label>
                  <Input
                    id="address2"
                    autoComplete="address-line2"
                    maxLength={120}
                    value={customer.address2 ?? ''}
                    onChange={(e) => updateCustomer('address2', e.target.value)}
                    aria-invalid={Boolean(errors.address2)}
                    placeholder="Dpto. 302 / Torre B"
                  />
                  {errors.address2 && (
                    <p className="text-xs text-destructive">{errors.address2}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    maxLength={80}
                    value={customer.city}
                    onChange={(e) => updateCustomer('city', e.target.value)}
                    onBlur={() => setErrors(validateCustomer(customerData).errors)}
                    aria-invalid={Boolean(errors.city)}
                    placeholder="Lima"
                  />
                  {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">
                    Estado / Provincia {countryCode === 'US' || countryCode === 'CA' ? '*' : '(opcional)'}
                  </Label>
                  <Input
                    id="province"
                    autoComplete="address-level1"
                    maxLength={80}
                    value={customer.province ?? ''}
                    onChange={(e) => updateCustomer('province', e.target.value)}
                    onBlur={() => setErrors(validateCustomer(customerData).errors)}
                    aria-invalid={Boolean(errors.province)}
                    placeholder={countryCode === 'US' ? 'FL' : 'Lima'}
                  />
                  {errors.province && (
                    <p className="text-xs text-destructive">{errors.province}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código postal *</Label>
                  <Input
                    id="postalCode"
                    autoComplete="postal-code"
                    maxLength={12}
                    value={customer.postalCode}
                    onChange={(e) => updateCustomer('postalCode', e.target.value)}
                    onBlur={() => setErrors(validateCustomer(customerData).errors)}
                    aria-invalid={Boolean(errors.postalCode)}
                    placeholder={countryCode === 'US' ? '33101' : '15001'}
                  />
                  {errors.postalCode && (
                    <p className="text-xs text-destructive">{errors.postalCode}</p>
                  )}
                </div>
                <div className="space-y-2 flex items-end">
                  <p className="text-xs text-muted-foreground">
                    País de destino: <strong>{country.name}</strong> (se elige abajo).
                  </p>
                </div>

              </div>


              <div className="mt-6">
                <Label className="mb-3 block">País de destino</Label>
                <div className="grid sm:grid-cols-4 gap-3">
                  {shippingCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCountryCode(c.code)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        c.code === countryCode
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.eta}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-medium text-lg mb-4">Método de pago</h2>
              <div className="space-y-3">
                {methods.map((m) => {
                  const Icon = m.icon;
                  const disabled = false;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setMethod(m.id)}
                      className={`w-full flex items-start gap-4 rounded-lg border p-4 text-left transition-colors disabled:opacity-40 ${
                        method === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <Icon className="h-5 w-5 mt-0.5 text-primary" />
                      <span>
                        <span className="block font-medium">{m.title}</span>
                        <span className="block text-sm text-muted-foreground">{m.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>




              {method === 'card' && showStripe && (
                <div className="mt-6 rounded-lg border border-border p-4">
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
                </div>
              )}
            </section>

          </div>

          <aside className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border p-6 sticky top-24">
              <h2 className="font-medium text-lg mb-4">Tu pedido</h2>
              <div className="space-y-3 text-sm">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {item.quantity}× {item.product.title}
                    </span>
                    <span>{formatPrice(item.variant.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border mt-4 pt-4">
                <Label htmlFor="coupon" className="mb-2 block text-sm">
                  Cupón de descuento
                </Label>
                {coupon ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <span>
                        <span className="font-medium">{coupon.code}</span>
                        <span className="block text-xs text-muted-foreground">{coupon.label}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      aria-label="Quitar cupón"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyCoupon();
                        }
                      }}
                      placeholder="BIENVENIDA10"
                      className="uppercase"
                    />
                    <Button type="button" variant="outline" onClick={applyCoupon}>
                      Aplicar
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Descuento ({coupon?.code})</span>
                    <span>-{formatPrice(totals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío a {country.name}</span>
                  <span>
                    {loadingShipping
                      ? 'Calculando…'
                      : totals.shipping === 0
                        ? 'Gratis'
                        : formatPrice(totals.shipping)}
                  </span>
                </div>
                {shippingQuote && totals.shipping > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {shippingQuote.title}
                    {shippingQuote.fromShopify ? ' · tarifa sincronizada con tu tienda' : ''}
                  </p>
                )}
                <div className="flex justify-between font-medium text-base border-t border-border pt-3">
                  <span>Total</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
                {countryCode === 'PE' && (
                  <p className="text-xs text-muted-foreground">≈ S/ {totals.totalPen.toFixed(2)}</p>
                )}
              </div>

              <Button
                className="w-full mt-6"
                size="lg"
                disabled={missingCustomer || paying || (method === 'card' && showStripe)}
                onClick={() => void handlePay()}
              >
                {paying
                  ? 'Procesando…'
                  : method === 'card' && showStripe
                    ? 'Completá el pago abajo'
                    : isFreeOrder
                      ? 'Confirmar pedido gratis'
                      : 'Pagar ahora'}
              </Button>


              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Pago procesado en pasarela segura
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5" /> Envío internacional {country.eta}
                </li>
              </ul>

              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
              >
                Volver al carrito
              </button>
            </div>
          </aside>
        </div>
      </div>
    </CheckoutShell>
  );
};

export default Checkout;
