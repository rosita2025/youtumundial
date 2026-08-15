import { useEffect, useState } from 'react';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { CreditCard } from 'lucide-react';

interface ExpressPayButtonsProps {
  /** Importe total en la moneda del checkout (USD). */
  amount: number;
  /** País de facturación/envío, usado para consultar las carteras. */
  countryCode: string;
  disabled?: boolean;
  onPay: () => void;
}

interface WalletSupport {
  checked: boolean;
  link: boolean;
  googlePay: boolean;
  applePay: boolean;
}

/** Marca oficial simplificada de Google Pay (para el botón negro). */
function GooglePayMark() {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <span aria-hidden className="inline-flex items-center text-[15px] leading-none tracking-tight">
        <span style={{ color: '#4285F4' }}>G</span>
        <span style={{ color: '#EA4335' }}>o</span>
        <span style={{ color: '#FBBC05' }}>o</span>
        <span style={{ color: '#4285F4' }}>g</span>
        <span style={{ color: '#34A853' }}>l</span>
        <span style={{ color: '#EA4335' }}>e</span>
      </span>
      <span style={{ color: '#FFFFFF' }}>Pay</span>
    </span>
  );
}

/**
 * Botones de pago exprés con la identidad de cada proveedor:
 *  - Link: verde de marca (#00D66F) con texto oscuro.
 *  - Google Pay / Apple Pay: botón negro con el logotipo de la marca.
 *
 * Antes de mostrarlos se verifica con Stripe que el proveedor esté disponible
 * (`paymentRequest.canMakePayment()`), para no ofrecer un método que el
 * navegador o la cuenta no soporten.
 */
export function ExpressPayButtons({ amount, countryCode, disabled, onPay }: ExpressPayButtonsProps) {
  const [support, setSupport] = useState<WalletSupport>({
    checked: false,
    link: false,
    googlePay: false,
    applePay: false,
  });

  useEffect(() => {
    let active = true;

    async function check() {
      if (!isStripeConfigured()) {
        if (active) setSupport({ checked: true, link: false, googlePay: false, applePay: false });
        return;
      }
      try {
        const stripe = await getStripe();
        if (!stripe) throw new Error('Stripe not available');

        const paymentRequest = stripe.paymentRequest({
          country: countryCode === 'PE' ? 'US' : countryCode,
          currency: 'usd',
          total: { label: 'Youtumundial', amount: Math.max(50, Math.round(amount * 100)) },
          requestPayerName: true,
          requestPayerEmail: true,
        });
        const result = await paymentRequest.canMakePayment();
        if (!active) return;
        setSupport({
          checked: true,
          // Link se ofrece siempre que Stripe esté configurado (se resuelve en
          // la página de pago alojada por Stripe).
          link: true,
          googlePay: Boolean(result?.googlePay),
          applePay: Boolean(result?.applePay),
        });
      } catch {
        if (active) setSupport({ checked: true, link: true, googlePay: false, applePay: false });
      }
    }

    void check();
    return () => {
      active = false;
    };
  }, [amount, countryCode]);

  if (!support.checked) {
    return (
      <div className="h-[52px] rounded-md border border-border animate-pulse" aria-hidden />
    );
  }

  // Si no hay ningún proveedor exprés (por ejemplo, Stripe sin configurar),
  // igual explicamos al comprador cómo seguir en vez de dejar un hueco vacío.
  if (!support.link && !support.googlePay && !support.applePay) {
    return (
      <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Express checkout is not available in this browser. You can pay with a card using the form below.
      </p>
    );
  }

  const walletLabel = support.applePay && !support.googlePay ? 'apple' : 'google';
  const walletAvailable = support.googlePay || support.applePay;

  return (
    <div className="space-y-2">
      <div className="grid sm:grid-cols-2 gap-3">
        {support.link && (
          <button
            type="button"
            disabled={disabled}
            onClick={onPay}
            aria-label="Pay with Link"
            // Colores oficiales de la marca Link (no son tokens del tema).
            style={{ backgroundColor: '#00D66F', color: '#011E0F' }}
            className="rounded-md py-3 text-sm font-semibold hover:brightness-95 transition disabled:opacity-60"
          >
            Link
          </button>
        )}

        {walletAvailable ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onPay}
            aria-label={walletLabel === 'apple' ? 'Pay with Apple Pay' : 'Pay with Google Pay'}
            // Botón negro exigido por las guías de marca de Google/Apple Pay.
            style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
            className="rounded-md py-3 text-sm inline-flex items-center justify-center hover:brightness-110 transition disabled:opacity-60"
          >
            {walletLabel === 'apple' ? (
              <span className="font-medium"> Pay</span>
            ) : (
              <GooglePayMark />
            )}
          </button>
        ) : (
          // Fallback visible: el botón sigue presente pero explica por qué no
          // se puede usar la cartera en este navegador o dispositivo.
          <div
            role="note"
            aria-live="polite"
            className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-3 text-center text-xs leading-snug text-muted-foreground"
          >
            <span className="block font-medium text-foreground">Google Pay / Apple Pay</span>
            Not available in this browser. Use Link or pay with a card below.
          </div>
        )}
      </div>
      
      {/* Indicadores visuales de tarjetas soportadas */}
      <div className="flex items-center justify-center gap-3 pt-2 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
        <img src="https://cdn.worldvectorlogo.com/logos/visa.svg" alt="Visa" className="h-2.5 w-auto" />
        <img src="https://cdn.worldvectorlogo.com/logos/mastercard-6.svg" alt="Mastercard" className="h-4 w-auto" />
        <img src="https://cdn.worldvectorlogo.com/logos/paypal-3.svg" alt="PayPal" className="h-3 w-auto" />
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

