import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { createCartCheckout } from '@/utils/payments.functions';

interface StripeCartCheckoutProps {
  /** Solo variante y cantidad: el precio real lo calcula el servidor. */
  items: { variantId: string; quantity: number }[];
  countryCode: string;
  couponCode?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  returnUrl: string;
}

export function StripeCartCheckout({
  items,
  countryCode,
  couponCode,
  customerEmail,
  customerName,
  customerPhone,
  returnUrl,
}: StripeCartCheckoutProps) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Los datos se congelan en refs: el formulario de Stripe se monta una sola
  // vez y no puede cambiar su clientSecret después de creado.
  const payload = useRef({
    items,
    countryCode,
    couponCode,
    customerEmail,
    customerName,
    customerPhone,
    returnUrl,
  });

  // Una sola sesión por montaje: si Stripe reintenta, reutilizamos la promesa
  // en vez de crear otra sesión de pago (evita cobros/pedidos duplicados).
  const sessionRef = useRef<Promise<string> | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!sessionRef.current) {
      sessionRef.current = (async () => {
        const result = await createCartCheckout({
          data: { ...payload.current, environment: getStripeEnvironment() },
        });
        if ('error' in result) throw new Error(result.error);
        if (!result.clientSecret) throw new Error('Stripe no devolvió una sesión de pago');
        return result.clientSecret;
      })().catch((e: Error) => {
        sessionRef.current = null;
        setError(e.message);
        throw e;
      });
    }
    const secret = await sessionRef.current;
    setReady(true);
    return secret;
  }, []);

  // Estable entre renders: un objeto nuevo remonta el proveedor y rompe el iframe.
  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);
  const stripePromise = useMemo(() => getStripe(), []);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        No pudimos abrir el pago: {error}
      </div>
    );
  }

  return (
    <div id="checkout" className="min-h-[320px]">
      {!ready && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando el pago seguro…
        </div>
      )}
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
