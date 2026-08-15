import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Package, Search, Truck, CheckCircle2, Clock } from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trackOrder, type PublicTracking } from '@/lib/orders/tracking.functions';

export const Route = createFileRoute('/seguimiento')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Seguimiento de pedido | Youtumundial' },
      {
        name: 'description',
        content:
          'Consultá el estado de tu compra en Youtumundial y el número de seguimiento de tu envío internacional.',
      },
      { property: 'og:title', content: 'Seguimiento de pedido | Youtumundial' },
      {
        property: 'og:description',
        content: 'Ingresá tu número de pedido y mirá en qué etapa está tu envío.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: TrackingPage,
});

const STEPS = [
  { key: 'recibido', label: 'Order received', icon: Clock },
  { key: 'preparando', label: 'Preparing shipment', icon: Package },
  { key: 'enviado', label: 'On the way', icon: Truck },
  { key: 'entregado', label: 'Delivered', icon: CheckCircle2 },
] as const;

function TrackingPage() {
  const lookup = useServerFn(trackOrder);
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicTracking | null>(null);

  const search = async () => {
    setLoading(true);
    try {
      setResult(await lookup({ data: { reference } }));
    } catch (e) {
      setResult({
        found: false,
        status: 'Unable to check your order',
        statusStep: 'recibido',
        items: [],
        message: 'Order tracking is currently unavailable. Please try again in a few minutes.',
      });
    } finally {
      setLoading(false);
    }
  };

  const activeIndex = result?.found
    ? STEPS.findIndex((s) => s.key === result.statusStep)
    : -1;

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-3xl">Track your order</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter the order number sent to your email. International shipments may take up to 72 hours to show movements.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="reference">Order number</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void search();
              }}
              placeholder="e.g. P20250516110728718"
              className="mt-2"
            />
          </div>
          <Button onClick={() => void search()} disabled={loading || !reference.trim()} size="lg">
            <Search className="mr-2 h-4 w-4" />
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {result && (
          <div className="mt-10 rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="mt-1 text-xl font-semibold">{result.status}</p>
            {result.reference && (
              <p className="mt-1 text-sm text-muted-foreground">Order {result.reference}</p>
            )}

            {result.found && (
              <ol className="mt-8 grid gap-4 sm:grid-cols-4">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const done = index <= activeIndex;
                  return (
                    <li
                      key={step.key}
                      className={`rounded-md border p-4 text-center ${
                        done ? 'border-primary/50 bg-primary/5' : 'opacity-60'
                      }`}
                    >
                      <Icon
                        className={`mx-auto h-5 w-5 ${done ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                      <p className="mt-2 text-xs font-medium">{step.label}</p>
                    </li>
                  );
                })}
              </ol>
            )}

            {result.tracking && (
              <div className="mt-8 rounded-md border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Tracking number</p>
                <p className="mt-1 font-mono text-sm">{result.tracking}</p>
                {result.trackingUrl && (
                  <a
                    className="mt-2 inline-block text-sm underline underline-offset-4"
                    href={result.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Track shipment
                  </a>
                )}
              </div>
            )}

            {result.items.length > 0 && (
              <ul className="mt-8 space-y-2 text-sm">
                {result.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-4 border-b pb-2">
                    <span>{item.title}</span>
                    <span className="text-muted-foreground">x{item.quantity}</span>
                  </li>
                ))}
              </ul>
            )}

            {(result.placedAt || result.shippedAt) && (
              <p className="mt-6 text-xs text-muted-foreground">
                {result.placedAt && <>Ordered: {result.placedAt}. </>}
                {result.shippedAt && <>Shipped: {result.shippedAt}.</>}
              </p>
            )}

            {result.message && (
              <p className="mt-6 text-sm text-muted-foreground">{result.message}</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
