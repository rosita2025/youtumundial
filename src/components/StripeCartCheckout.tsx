import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
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
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCartCheckout({
      data: {
        items,
        countryCode,
        couponCode,
        customerEmail,
        customerName,
        customerPhone,
        returnUrl,
        environment: getStripeEnvironment(),
      },
    });
    if ('error' in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error('Stripe no devolvió una sesión de pago');
    return result.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
