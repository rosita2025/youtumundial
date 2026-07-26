import { createServerFn } from '@tanstack/react-start';
import {
  type CartCheckoutInput,
  createCartSession,
  getStripeErrorMessage,
} from '@/lib/stripe.server';

export const createCartCheckout = createServerFn({ method: 'POST' })
  .inputValidator((data: CartCheckoutInput) => {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('El carrito está vacío');
    }
    return data;
  })
  .handler(async ({ data }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const clientSecret = await createCartSession(data);
      return { clientSecret };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
