import { createServerFn } from '@tanstack/react-start';
import {
  type CartCheckoutInput,
  type StripeErrorKind,
  createCartSession,
  getFriendlyStripeError,
} from '@/lib/stripe.server';

export const createCartCheckout = createServerFn({ method: 'POST' })
  .inputValidator((data: CartCheckoutInput) => {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Your cart is empty');
    }
    // Server-side revalidation of checkout form data.
    const email = String(data.customerEmail ?? '').trim().slice(0, 160);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error('Please enter a valid email to continue.');
    }
    const name = String(data.customerName ?? '').trim().slice(0, 120);
    if (name.replace(/\s/g, '').length < 4) {
      throw new Error('Please enter your first and last name to continue.');
    }
    const phone = String(data.customerPhone ?? '').trim().slice(0, 25);
    if (phone.replace(/\D/g, '').length < 8) {
      throw new Error('Please enter a valid phone number with country code.');
    }
    return { ...data, customerEmail: email, customerName: name, customerPhone: phone };
  })

  .handler(async ({ data }): Promise<
    { clientSecret: string } | { error: string; errorKind: StripeErrorKind }
  > => {
    try {
      const clientSecret = await createCartSession(data);
      return { clientSecret };
    } catch (error) {
      const friendly = getFriendlyStripeError(error);
      return { error: friendly.message, errorKind: friendly.kind };
    }
  });

