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
      // Con Stripe configurado siempre ofrecemos Link y Google Pay: el pago se
      // resuelve en la página de Stripe, que los presenta de forma nativa.
      if (active) {
        setSupport({ checked: true, link: true, googlePay: true, applePay: false });
      }
      try {
        const stripe = await getStripe();
        if (!stripe) return;

        const paymentRequest = stripe.paymentRequest({
          country: countryCode === 'PE' ? 'US' : countryCode,
          currency: 'usd',
          total: { label: 'Youtumundial', amount: Math.max(50, Math.round(amount * 100)) },
          requestPayerName: true,
          requestPayerEmail: true,
          requestPayerPhone: true,
        });
        const result = await paymentRequest.canMakePayment();
        if (!active) return;
        // Apple Pay solo se muestra cuando el dispositivo lo soporta.
        setSupport((prev) => ({ ...prev, applePay: Boolean(result?.applePay) }));
      } catch {
        // Sin detección de carteras mantenemos Link + Google Pay.
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

  const walletAvailable = support.googlePay || support.applePay;
  const busy = Boolean(disabled) || pending !== null;

  function startPayment(method: ExpressMethod) {
    setPending(method);
    onPay();
  }

  const statusText =
    pending === 'link'
      ? 'Opening secure Link payment...'
      : pending === 'googlePay'
        ? 'Processing your Google Pay payment...'
        : pending === 'applePay'
          ? 'Processing your Apple Pay payment...'
          : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {/* Row 1: Link & PayPal */}
        <div className="grid grid-cols-2 gap-3">
          {support.link && (
            <button
              type="button"
              disabled={busy}
              onClick={() => startPayment('link')}
              aria-label="Pay with Link"
              aria-busy={pending === 'link'}
              style={{ backgroundColor: '#00D66F', color: '#011E0F' }}
              className="rounded-md py-3 text-sm font-semibold hover:brightness-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {pending === 'link' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Processing...
                </>
              ) : (
                <>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/4/4e/Link_logo_2022.svg" alt="" className="h-4 w-auto" />
                  Link
                </>
              )}
            </button>
          )}

          <div className="relative group">
            <button
              type="button"
              disabled
              aria-label="PayPal (Coming Soon)"
              style={{ backgroundColor: '#FFC439', color: '#003087' }}
              className="w-full rounded-md py-3 text-sm font-semibold opacity-60 cursor-not-allowed flex items-center justify-center relative overflow-hidden"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 w-auto grayscale" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                <span className="text-[10px] uppercase tracking-tighter font-bold bg-white/90 px-2 py-0.5 rounded shadow-sm">Coming Soon</span>
              </div>
            </button>
          </div>

        </div>

        {/* Row 2: Apple/Google Pay */}
        {walletAvailable ? (
          <div className="flex flex-col gap-3">
            {support.googlePay && (
              <button
                type="button"
                disabled={busy}
                onClick={() => startPayment('googlePay')}
                aria-label="Pay with Google Pay"
                aria-busy={pending === 'googlePay'}
                style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
                className="rounded-md py-3 text-sm inline-flex items-center justify-center gap-2 hover:brightness-110 transition disabled:opacity-60 w-full"
              >
                {pending === 'googlePay' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span className="font-medium">Processing...</span>
                  </>
                ) : (
                  <GooglePayMark />
                )}
              </button>
            )}
            
            {support.applePay && (
              <button
                type="button"
                disabled={busy}
                onClick={() => startPayment('applePay')}
                aria-label="Pay with Apple Pay"
                aria-busy={pending === 'applePay'}
                style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
                className="rounded-md py-3 text-sm inline-flex items-center justify-center gap-2 hover:brightness-110 transition disabled:opacity-60 w-full"
              >
                {pending === 'applePay' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span className="font-medium">Processing...</span>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-5 w-auto invert" />
                  </div>
                )}
              </button>
            )}
          </div>
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

      {/* Live status for express payments */}
      <p aria-live="polite" role="status" className="min-h-[1rem] text-center text-xs text-muted-foreground">
        {statusText && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            {statusText}
          </span>
        )}
      </p>

      
      {/* Visual Trust Badges */}
      <div className="flex flex-col items-center gap-2 pt-2 border-t border-gray-100 mt-4">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Secure Global Payments</span>
        <div className="flex items-center justify-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
          <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-6 w-auto" />
          <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-6 w-auto" />
          <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-6 w-auto" />
          <img src="https://img.icons8.com/color/48/apple-pay.png" alt="Apple Pay" className="h-6 w-auto" />
          <img src="https://img.icons8.com/color/48/google-pay.png" alt="Google Pay" className="h-6 w-auto" />
        </div>
      </div>
    </div>
  );
}

