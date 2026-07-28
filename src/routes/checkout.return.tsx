import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { fulfillSupOrder, type FulfillmentResult } from '@/lib/suppliers/fulfillment.functions';
import { getStripeEnvironment } from '@/lib/stripe';
import { Loader2, PackageCheck, Truck } from 'lucide-react';


export const Route = createFileRoute('/checkout/return')({
  head: () => ({
    meta: [
      { title: 'Pago confirmado — Ropa de Youtumundial' },
      {
        name: 'description',
        content: 'Confirmación de tu pedido en Ropa de Youtumundial con envío internacional.',
      },
      { property: 'og:title', content: 'Pago confirmado — Ropa de Youtumundial' },
      { property: 'og:description', content: 'Gracias por tu compra en Youtumundial.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string; free?: string } => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
    free: typeof search.free === 'string' ? search.free : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId, free } = Route.useSearch();
  const isFreeOrder = free === '1';
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [result, setResult] = useState<FulfillmentResult | null>(null);

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <h1 className="font-display text-3xl md:text-4xl mb-4">
          {sessionId || isFreeOrder ? '¡Gracias por tu compra!' : 'No encontramos tu pago'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isFreeOrder
            ? 'Tu pedido con cupón quedó confirmado automáticamente. Te escribimos por email con el seguimiento del envío.'
            : sessionId
              ? 'Recibimos tu pago y ya estamos preparando el envío. Te escribimos por email con el seguimiento.'
              : 'Si creés que hubo un error, escribinos y lo revisamos.'}
        </p>


        {sessionId && state === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Registrando tu pedido con el proveedor…
          </div>
        )}

        {sessionId && state === 'done' && result && (
          <div className="rounded-lg border border-border p-5 text-left text-sm space-y-2 mb-8">
            {result.supOrderId ? (
              <>
                <p className="flex items-center gap-2 font-medium">
                  <PackageCheck className="h-4 w-4" /> Pedido enviado al proveedor
                </p>
                <p className="text-muted-foreground">N° de pedido: {result.supOrderId}</p>
                {result.status && <p className="text-muted-foreground">Estado: {result.status}</p>}
                {result.tracking && (
                  <p className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Seguimiento: <span className="font-medium">{result.tracking}</span>
                    {result.carrier ? ` (${result.carrier})` : ''}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  {result.message ?? 'Estamos preparando tu pedido manualmente.'}
                </p>
                {result.pending && (
                  <p className="text-muted-foreground">
                    Te enviamos un email con el detalle y te avisamos apenas salga el envío.
                  </p>
                )}
              </div>
            )}

          </div>
        )}

        {sessionId && (
          <p className="text-xs text-muted-foreground mb-8 break-all">Referencia: {sessionId}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/products">Seguir comprando</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/seguimiento">Ver estado y tracking</Link>
          </Button>
        </div>

      </div>
    </Layout>

  );
}
