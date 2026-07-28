import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import { Layout } from '@/components/layout/Layout';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { checkoutConfig, shippingCountries } from '@/lib/checkout/config';
import {
  
  buildPaypalLink,
  buildWhatsappOrderLink,
  getTotals,
  type PaymentMethod,
} from '@/lib/checkout/order';
import { type Coupon } from '@/lib/checkout/coupons';
import { validateCoupon } from '@/lib/checkout/coupon.functions';
import { getShippingQuote, type ShippingQuoteResult } from '@/lib/checkout/shipping.functions';
import { CreditCard, Smartphone, Wallet, ShieldCheck, Truck, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { createDirectSupOrder } from '@/lib/suppliers/direct-order.functions';
import { StripeCartCheckout } from '@/components/StripeCartCheckout';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';


const methods: { id: PaymentMethod; title: string; description: string; icon: typeof CreditCard }[] = [
  {
    id: 'card',
    title: 'Tarjeta de crédito o débito',
    description: 'Visa, Mastercard y Amex de Perú, EE.UU., Canadá y Reino Unido. Pago seguro en la misma página.',
    icon: CreditCard,
  },

  {
    id: 'paypal',
    title: 'PayPal',
    description: 'Pagá con tu saldo o tarjeta desde EE.UU., Canadá o Reino Unido.',
    icon: Wallet,
  },
  {
    id: 'yape',
    title: 'Yape / Plin',
    description: 'Solo Perú. Escaneá el QR y enviás la captura por WhatsApp.',
    icon: Smartphone,
  },
];


const Checkout = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [showStripe, setShowStripe] = useState(false);
  const createSupOrder = useServerFn(createDirectSupOrder);
  const checkCoupon = useServerFn(validateCoupon);
  const fetchShipping = useServerFn(getShippingQuote);

  const [countryCode, setCountryCode] = useState(shippingCountries[0].code);
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [errors, setErrors] = useState<CustomerErrors>({});

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);

  const [shippingQuote, setShippingQuote] = useState<ShippingQuoteResult | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

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

  if (cart.items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-3xl mb-4">Tu carrito está vacío</h1>
          <p className="text-muted-foreground mb-8">Agregá prendas antes de pasar por caja.</p>
          <Button size="lg" asChild>
            <Link to="/products">Ver productos</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const missingCustomer = !customer.name || !customer.email || !customer.address;
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

  const handlePay = async () => {
    if (missingCustomer) {
      toast.error('Completá tus datos de envío para continuar.');
      return;
    }

    if (isFreeOrder) {
      const reference = `YTM-${Date.now()}`;
      let freeOrderNumber: string | undefined;
      try {
        // Número visible del pedido en Shopify, para mostrarlo al cliente.
        const result = await createSupOrder({
          data: {
            reference,
            name: customer.name,
            email: customer.email,
            countryCode,
            address: customer.address,
            couponCode: coupon?.code,
            items: cartLines,
          },
        });
        if (!result.ok) {
          toast.error(result.message ?? 'No se pudo registrar el pedido.');
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
        return;
      }

      clearCart();
      navigate(
        freeOrderNumber
          ? `/checkout/return?free=1&order=${encodeURIComponent(freeOrderNumber)}`
          : '/checkout/return?free=1',
      );
      return;
    }



    if (method === 'card') {
      setShowStripe(true);
      return;
    }


    if (method === 'paypal') {
      const link = buildPaypalLink(totals.total);
      if (link) {
        window.location.href = link;
        return;
      }
    }

    if (method === 'yape') {
      window.open(
        buildWhatsappOrderLink(cart, country, totals, customer),
        '_blank',
        'noopener,noreferrer',
      );
      return;
    }

    toast.error('Ese método aún no está configurado. Escribinos por WhatsApp y cerramos el pedido.');
    window.open(
      buildWhatsappOrderLink(cart, country, totals, customer),
      '_blank',
      'noopener,noreferrer',
    );
  };


  return (
    <Layout>
      <PaymentTestModeBanner />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Carrito', href: '/cart' }, { label: 'Checkout' }]} />


        <h1 className="font-display text-3xl md:text-4xl mt-6 mb-8">Finalizar compra</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="font-medium text-lg mb-4">1. Datos de envío</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre y apellido</Label>
                  <Input
                    id="name"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="Ana Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="ana@email.com"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Dirección completa</Label>
                  <Input
                    id="address"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    placeholder="Calle, número, ciudad, código postal"
                  />
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
              <h2 className="font-medium text-lg mb-4">2. Método de pago</h2>
              <div className="space-y-3">
                {methods.map((m) => {
                  const Icon = m.icon;
                  const disabled = m.id === 'yape' && countryCode !== 'PE';
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

              {method === 'yape' && (
                <div className="mt-4 rounded-lg border border-border p-4 flex flex-col sm:flex-row gap-4 items-start">
                  {checkoutConfig.yapeQrUrl ? (
                    <img
                      src={checkoutConfig.yapeQrUrl}
                      alt="Código QR para pagar con Yape o Plin"
                      className="h-36 w-36 rounded-md object-contain bg-card"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-36 w-36 rounded-md border border-dashed border-border grid place-items-center text-xs text-muted-foreground text-center px-2">
                      QR pendiente de cargar
                    </div>
                  )}
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Pagá S/ {totals.totalPen.toFixed(2)}</p>
                    {checkoutConfig.yapeNumber && <p>Yape: {checkoutConfig.yapeNumber}</p>}
                    {checkoutConfig.plinNumber && <p>Plin: {checkoutConfig.plinNumber}</p>}
                    <p className="text-muted-foreground">
                      Al confirmar se abre WhatsApp con el detalle del pedido. Adjuntá la captura del pago
                      y confirmamos el envío.
                    </p>
                  </div>
                </div>
              )}

              {method === 'card' && showStripe && (
                <div className="mt-6 rounded-lg border border-border p-4">
                  <StripeCartCheckout
                    items={cartLines}
                    countryCode={countryCode}
                    couponCode={coupon?.code}
                    customerEmail={customer.email}
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

              <Button className="w-full mt-6" size="lg" onClick={() => void handlePay()}>
                {isFreeOrder
                  ? 'Confirmar pedido gratis'
                  : method === 'yape'
                    ? 'Confirmar pedido por WhatsApp'
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
    </Layout>
  );
};

export default Checkout;
