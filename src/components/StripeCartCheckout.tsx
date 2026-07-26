import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { createCartCheckout } from '@/utils/payments.functions';

interface StripeCartCheckoutProps {
  items: { name: string; amountInCents: number; quantity: number }[];
  shippingInCents: number;
  customerEmail?: string;
  returnUrl: string;
}

export function StripeCartCheckout({
  items,
  shippingInCents,
  customerEmail,
  returnUrl,
}: StripeCartCheckoutProps) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCartCheckout({
      data: {
        items,
        shippingInCents,
        customerEmail,
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
