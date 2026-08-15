import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { createCartCheckout } from '@/utils/payments.functions';

type CheckoutErrorKind = 'card' | 'data' | 'temporary' | 'config';

interface CheckoutError {
  message: string;
  kind: CheckoutErrorKind;
}

class CheckoutFailure extends Error {
  kind: CheckoutErrorKind;
  constructor(message: string, kind: CheckoutErrorKind) {
    super(message);
    this.kind = kind;
  }
}


interface StripeCartCheckoutProps {
  /** Solo variante y cantidad: el precio real lo calcula el servidor. */
  items: { variantId: string; quantity: number }[];
  countryCode: string;
  couponCode?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  /** Carrito abandonado a cerrar cuando el pago se confirme. */
  abandonedReference?: string;
  returnUrl: string;
}

export function StripeCartCheckout({
  items,
  countryCode,
  couponCode,
  customerEmail,
  customerName,
  customerPhone,
  abandonedReference,
  returnUrl,
}: StripeCartCheckoutProps) {
  const [error, setError] = useState<CheckoutError | null>(null);
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
    abandonedReference,
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
        if ('error' in result) {
          throw new CheckoutFailure(result.error, result.errorKind ?? 'temporary');
        }
        if (!result.clientSecret) {
          throw new CheckoutFailure(
            'El pago no está disponible en este momento. Esperá unos segundos e intentá de nuevo.',
            'temporary',
          );
        }
        return result.clientSecret;
      })().catch((e: unknown) => {
        sessionRef.current = null;
        if (e instanceof CheckoutFailure) {
          setError({ message: e.message, kind: e.kind });
        } else {
          setError({
            message: 'No pudimos iniciar el pago. Revisá tu conexión e intentá de nuevo.',
            kind: 'temporary',
          });
        }
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
    const retry = () => {
      setError(null);
      setReady(false);
      sessionRef.current = null;
      fetchClientSecret().catch(() => {});
    };

    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center space-y-4">
        <p className="text-sm text-destructive font-medium">{error.message}</p>

        {error.kind === 'data' && (
          <button
            onClick={() => {
              setError(null);
              setReady(false);
              sessionRef.current = null;
              document
                .querySelector('input[name="address1"], input[autocomplete="email"]')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="text-xs text-blue-600 underline hover:text-blue-800 font-medium"
          >
            Revisar mis datos
          </button>
        )}

        {(error.kind === 'temporary' || error.kind === 'card') && (
          <button
            onClick={retry}
            className="text-xs text-blue-600 underline hover:text-blue-800 font-medium"
          >
            Intentar de nuevo
          </button>
        )}

        {error.kind === 'config' && (
          <p className="text-xs text-muted-foreground">
            Escribinos por WhatsApp y completamos tu pedido manualmente.
          </p>
        )}
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
