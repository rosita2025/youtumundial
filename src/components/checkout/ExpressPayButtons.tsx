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
    <div className="space-y-4">
      <div className="grid gap-3">
        {/* Row 1: Link & PayPal */}
        <div className="grid grid-cols-2 gap-3">
          {support.link && (
            <button
              type="button"
              disabled={disabled}
              onClick={onPay}
              aria-label="Pay with Link"
              style={{ backgroundColor: '#00D66F', color: '#011E0F' }}
              className="rounded-md py-3 text-sm font-semibold hover:brightness-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Link_logo_2022.svg" alt="" className="h-4 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
              Link
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={onPay}
            aria-label="Pay with PayPal"
            style={{ backgroundColor: '#FFC439', color: '#003087' }}
            className="rounded-md py-3 text-sm font-semibold hover:brightness-95 transition disabled:opacity-60 flex items-center justify-center"
          >
            <img src="https://cdn.worldvectorlogo.com/logos/paypal-3.svg" alt="PayPal" className="h-4 w-auto" />
          </button>
        </div>

        {/* Row 2: Apple/Google Pay */}
        {walletAvailable ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onPay}
            aria-label={walletLabel === 'apple' ? 'Pay with Apple Pay' : 'Pay with Google Pay'}
            style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
            className="rounded-md py-3 text-sm inline-flex items-center justify-center hover:brightness-110 transition disabled:opacity-60 w-full"
          >
            {walletLabel === 'apple' ? (
              <div className="flex items-center gap-1.5">
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-5 w-auto invert" />
              </div>
            ) : (
              <GooglePayMark />
            )}
          </button>
        ) : (
          <div
            role="note"
            className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2.5 text-center text-[10px] leading-snug text-muted-foreground"
          >
            <span className="font-medium text-foreground block mb-0.5">Google Pay / Apple Pay</span>
            Available on supported browsers & devices.
          </div>
        )}
      </div>
      
      {/* Visual Trust Badges */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-gray-100 mt-4">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Secure Global Payments</span>
        <div className="flex items-center justify-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
          <img src="https://static-00.iconduck.com/assets.00/visa-icon-2048x628-66dq799i.png" alt="Visa" className="h-2 w-auto" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 w-auto" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 w-auto" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-5 w-auto" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Pay_Logo_%282020%29.svg" alt="Google Pay" className="h-4 w-auto" />
        </div>
      </div>
    </div>
  );
}

