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
      throw new Error('El carrito está vacío');
    }
    // Revalidación en el servidor de los datos del formulario propio.
    const email = String(data.customerEmail ?? '').trim().slice(0, 160);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error('Escribí un correo válido para continuar.');
    }
    const name = String(data.customerName ?? '').trim().slice(0, 120);
    if (name.replace(/\s/g, '').length < 4) {
      throw new Error('Escribí tu nombre y apellido para continuar.');
    }
    const phone = String(data.customerPhone ?? '').trim().slice(0, 25);
    if (phone.replace(/\D/g, '').length < 8) {
      throw new Error('Escribí un teléfono válido con código de país.');
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

