import { createFileRoute, Link } from '@tanstack/react-router';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';

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
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24 text-center max-w-xl">
        <h1 className="font-display text-3xl md:text-4xl mb-4">
          {sessionId ? '¡Gracias por tu compra!' : 'No encontramos tu pago'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {sessionId
            ? 'Recibimos tu pago y ya estamos preparando el envío. Te escribimos por email con el seguimiento.'
            : 'Si creés que hubo un error, escribinos y lo revisamos.'}
        </p>
        {sessionId && (
          <p className="text-xs text-muted-foreground mb-8 break-all">Referencia: {sessionId}</p>
        )}
        <Button asChild size="lg">
          <Link to="/products">Seguir comprando</Link>
        </Button>
      </div>
    </Layout>
  );
}
