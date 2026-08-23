import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { fbEvent } from '@/lib/facebook-pixel';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { Button } from '@/components/ui/button';
import { fulfillSupOrder, type FulfillmentResult } from '@/lib/suppliers/fulfillment.functions';
import { getOrderSummary, type OrderSummary } from '@/lib/checkout/order-summary.functions';
import { getStripeEnvironment } from '@/lib/stripe';
import { clearAbandonedCheckout } from '@/lib/checkout/abandoned.functions';
import { Loader2, PackageCheck, RefreshCw, Truck } from 'lucide-react';

const money = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}




export const Route = createFileRoute('/checkout_/return')({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      { title: 'Payment Confirmed — Youtumundial' },
      {
        name: 'description',
        content: 'Your order at Youtumundial has been confirmed. International shipping is being prepared.',
      },
      { property: 'og:title', content: 'Payment Confirmed — Youtumundial' },
      { property: 'og:description', content: 'Thank you for your purchase at Youtumundial.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    session_id?: string;
    free?: string;
    order?: string;
    manual?: string;
    reference?: string;
  } => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
    free: typeof search.free === 'string' ? search.free : undefined,
    order: typeof search.order === 'string' ? search.order.slice(0, 20) : undefined,
    manual: typeof search.manual === 'string' ? search.manual : undefined,
    reference: typeof search.reference === 'string' ? search.reference.slice(0, 60) : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  // La compra terminó: borramos el carrito abandonado guardado en Shopify.
  useEffect(() => {
    const reference = window.sessionStorage.getItem('ytm-abandoned-ref');
    if (!reference) return;
    window.sessionStorage.removeItem('ytm-abandoned-ref');
    clearAbandonedCheckout({ data: { reference } }).catch(() => {});
  }, []);

  const {
    session_id: sessionId,
    free,
    order: freeOrderNumber,
    manual,
    reference,
  } = Route.useSearch();
  const isFreeOrder = free === '1';
  const isManualOrder = manual === '1';

  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [result, setResult] = useState<FulfillmentResult | null>(null);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [autoTries, setAutoTries] = useState(0);
  const trackedRef = useRef(false);


  const shopifyNumber =
    isFreeOrder || isManualOrder ? freeOrderNumber : result?.shopifyOrderNumber;

  // Código de respaldo estable: si Shopify tarda o falla, el cliente siempre se
  // lleva un número con el que podemos encontrar su pedido (deriva del pago).
  const fallbackNumber = sessionId
    ? `YTM-${sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`
    : reference || undefined;

  const orderNumber = shopifyNumber ? `#${shopifyNumber.replace('#', '')}` : fallbackNumber;
  const isFallbackNumber = !shopifyNumber && Boolean(fallbackNumber);


  useEffect(() => {
    const paid = Boolean(shopifyNumber) || Boolean(result?.paid) || summary?.paid === true;
    if (orderNumber && paid && !trackedRef.current) {
      trackedRef.current = true;
      fbEvent.track('Purchase', {
        content_ids: result?.supOrderId ? [result.supOrderId] : [],
        content_type: 'product',
        value: summary?.total ?? (result as any)?.paidAmount ?? 0,
        currency: summary?.currency ?? 'USD',
        order_id: orderNumber
      });
    }
  }, [orderNumber, shopifyNumber, result, summary]);


  // Resumen del pedido tal como se cobró en Stripe.
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    setSummaryLoading(true);
    getOrderSummary({ data: { sessionId, environment: getStripeEnvironment() } })
      .then((res) => {
        if (active) setSummary(res);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setSummaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);



  const resync = () => {
    if (!sessionId || resyncing) return;
    setResyncing(true);
    fulfillSupOrder({ data: { sessionId, environment: getStripeEnvironment() } })
      .then((res) => setResult(res))
      .catch((error: Error) => setResult({ ok: false, paid: false, message: error.message }))
      .finally(() => setResyncing(false));
  };

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    setState('loading');
    fulfillSupOrder({ data: { sessionId, environment: getStripeEnvironment() } })
      .then((res) => {
        if (!active) return;
        setResult(res);
        setState('done');
      })
      .catch((error: Error) => {
        if (!active) return;
        setResult({ ok: false, paid: false, message: error.message });
        setState('done');
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  // Un solo reintento rápido: si Shopify aún no devolvió el número de pedido,
  // lo volvemos a pedir una sola vez tras 1 segundo (la creación es idempotente).
  const MAX_AUTO_TRIES = 1;

  useEffect(() => {
    if (!sessionId || state !== 'done' || resyncing) return;
    if (result?.shopifyOrderNumber) return;
    if (autoTries >= MAX_AUTO_TRIES) return;
    const timer = setTimeout(() => {
      setAutoTries((n) => n + 1);
      setResyncing(true);
      fulfillSupOrder({ data: { sessionId, environment: getStripeEnvironment() } })
        .then((res) => setResult(res))
        .catch(() => undefined)
        .finally(() => setResyncing(false));
    }, 1000);
    return () => clearTimeout(timer);
  }, [sessionId, state, result?.shopifyOrderNumber, autoTries, resyncing]);

  // Estado de sincronización visible para el cliente, en tiempo real.
  const syncState: 'syncing' | 'synced' | 'delayed' =
    shopifyNumber
      ? 'synced'
      : state === 'loading' || resyncing
        ? 'syncing'
        : 'delayed';

  const confirmed = Boolean(sessionId) || isFreeOrder || isManualOrder;


  return (
    <CheckoutShell>
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <h1 className="font-display text-3xl md:text-4xl mb-4">
          {isManualOrder
            ? 'Order Registered!'
            : confirmed
              ? 'Purchase successful!'
              : 'Payment not found'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isManualOrder
            ? 'Your order has been registered as pending. Please send us your payment confirmation via WhatsApp to proceed with shipping.'
            : isFreeOrder
              ? 'Your order has been automatically confirmed. We will send you an email with shipping tracking details shortly.'
              : sessionId
                ? 'We have received your payment and are preparing your shipment. You will receive an email with tracking information soon.'
                : 'If you think there has been an error, please contact us.'}
        </p>


        {confirmed && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 mb-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Order number
            </p>
            <p className="font-display text-4xl font-bold break-all">{(orderNumber || '').startsWith('YTM-') ? orderNumber : `#${(orderNumber || '').replace('#', '')}`}</p>
            {isFallbackNumber && (
              <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {resyncing || state === 'loading' ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Confirming your store order number...
                  </>
                ) : (
                  'Keep this code. We will email you the final store order number shortly.'
                )}
              </p>
            )}
            {isManualOrder && reference && (
              <p className="mt-2 text-xs text-muted-foreground">Reference: {reference}</p>
            )}
          </div>
        )}

        {sessionId && !isFreeOrder && !isManualOrder && (
          <div
            className={`rounded-lg border p-4 mb-8 text-left ${
              syncState === 'synced'
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-secondary/20'
            }`}
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              {syncState === 'syncing' ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              ) : (
                <PackageCheck className="h-5 w-5 shrink-0 text-primary" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {syncState === 'synced'
                    ? 'Order confirmed in our store'
                    : syncState === 'syncing'
                      ? 'Confirming your order...'
                      : 'Order registered'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {syncState === 'synced'
                    ? `Store order number #${(shopifyNumber || '').replace('#', '')}`
                    : syncState === 'syncing'
                      ? 'Just a moment.'
                      : 'We will email you the store order number shortly.'}
                </p>
              </div>
            </div>
          </div>
        )}




        {sessionId && (summaryLoading || summary?.ok) && (

          <div className="rounded-lg border border-border p-5 text-left mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Order summary
            </h2>

            {summaryLoading && !summary ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your order details...
              </p>
            ) : summary ? (
              <>
                <ul className="space-y-3 text-sm">
                  {summary.lines.map((line, index) => (
                    <li key={`${line.description}-${index}`} className="flex justify-between gap-4">
                      <span className="text-foreground">
                        {line.description}
                        {line.quantity > 1 && (
                          <span className="text-muted-foreground"> × {line.quantity}</span>
                        )}
                      </span>
                      <span className="font-medium whitespace-nowrap">
                        {money(line.amount, summary.currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 border-t border-border pt-4 space-y-2 text-sm">
                  <Row label="Subtotal" value={money(summary.subtotal, summary.currency)} />
                  {summary.discount > 0 && (
                    <Row
                      label="Discount"
                      value={`- ${money(summary.discount, summary.currency)}`}
                    />
                  )}
                  <Row
                    label="Shipping"
                    value={
                      summary.shipping > 0 ? money(summary.shipping, summary.currency) : 'Free'
                    }
                  />
                  {summary.tax > 0 && (
                    <Row label="Taxes" value={money(summary.tax, summary.currency)} />
                  )}
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                    <span>Total paid</span>
                    <span>{money(summary.total, summary.currency)}</span>
                  </div>
                </div>

                {(summary.email || summary.address) && (
                  <div className="mt-4 border-t border-border pt-4 space-y-1 text-xs text-muted-foreground">
                    {summary.email && <p>Confirmation sent to {summary.email}</p>}
                    {summary.address && (
                      <p>
                        Shipping to {summary.name ? `${summary.name}, ` : ''}
                        {summary.address}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}



        {sessionId && state === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Registering your order with the supplier...
          </div>
        )}

        {sessionId && state === 'done' && result && (
          <div className="rounded-lg border border-border p-5 text-left text-sm space-y-2 mb-8">

            {result.supOrderId ? (
              <>
                <p className="flex items-center gap-2 font-medium">
                  <PackageCheck className="h-4 w-4" /> Order sent to supplier
                </p>
                <p className="text-muted-foreground">Supplier ID: {result.supOrderId}</p>
                {result.status && <p className="text-muted-foreground">Status: {result.status}</p>}
                {result.tracking && (
                  <p className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Tracking: <span className="font-medium">{result.tracking}</span>
                    {result.carrier ? ` (${result.carrier})` : ''}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-muted-foreground">We are preparing your order.</p>

                {result.pending && (
                  <p className="text-muted-foreground">
                    We have sent you an email and will notify you as soon as the package is shipped.
                  </p>
                )}
              </div>
            )}

            {(!result.supOrderId || !result.shopifyOrderNumber) && (
              <div className="mt-4 p-4 rounded bg-secondary/30 border border-secondary text-center">
                <p className="text-xs text-muted-foreground mb-3">
                  If your order number hasn't appeared, you can try to register it manually.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={resync}
                  disabled={resyncing}
                  className="w-full sm:w-auto"
                >
                  {resyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {resyncing ? 'Registering...' : 'Register order in Shopify'}
                </Button>
              </div>
            )}

          </div>
        )}

        {sessionId && (
          <p className="text-xs text-muted-foreground mb-8 break-all">Reference: {sessionId}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/products">Continue shopping</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/seguimiento">View tracking status</Link>
          </Button>
        </div>

      </div>
    </CheckoutShell>

  );
}
