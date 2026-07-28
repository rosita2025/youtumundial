import { createServerFn } from '@tanstack/react-start';

export interface AbandonedCheckoutRequest {
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode: string;
  address: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  couponCode?: string;
  items: { variantId: string; quantity: number }[];
}

export interface AbandonedCheckoutResponse {
  ok: boolean;
  message?: string;
}

/**
 * Guarda en Shopify el carrito abandonado del checkout propio.
 *
 * Se llama cuando el cliente ya completó correo, nombre, teléfono, país y
 * dirección pero todavía no pagó. Los precios se recalculan en el servidor con
 * el catálogo real: el navegador solo manda variante + cantidad.
 * Nunca devuelve detalles internos ni rompe la compra si Shopify falla.
 */
export const saveAbandonedCheckout = createServerFn({ method: 'POST' })
  .inputValidator((input: AbandonedCheckoutRequest) => ({
    reference: String(input?.reference ?? '').slice(0, 60),
    firstName: String(input?.firstName ?? '').slice(0, 60),
    lastName: String(input?.lastName ?? '').slice(0, 60),
    email: String(input?.email ?? '').slice(0, 160),
    phone: String(input?.phone ?? '').slice(0, 40),
    countryCode: String(input?.countryCode ?? '').slice(0, 5),
    address: String(input?.address ?? '').slice(0, 300),
    address1: String(input?.address1 ?? '').slice(0, 200),
    address2: String(input?.address2 ?? '').slice(0, 120),
    city: String(input?.city ?? '').slice(0, 80),
    province: String(input?.province ?? '').slice(0, 80),
    postalCode: String(input?.postalCode ?? '').slice(0, 12),
    couponCode: String(input?.couponCode ?? '').slice(0, 40),
    items: Array.isArray(input?.items) ? input.items.slice(0, 30) : [],
  }))
  .handler(async ({ data }): Promise<AbandonedCheckoutResponse> => {
    const { customerSchema, composeAddress } = await import('./customer');
    const parsed = customerSchema.safeParse({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      countryCode: data.countryCode,
    });
    if (!parsed.success || !data.reference) {
      return { ok: false, message: 'Datos incompletos.' };
    }

    const { priceOrder, normalizeCartLines } = await import('./pricing.server');
    let priced;
    try {
      priced = await priceOrder({
        items: normalizeCartLines(data.items),
        countryCode: data.countryCode,
        couponCode: data.couponCode || undefined,
      });
    } catch {
      return { ok: false, message: 'No se pudo calcular el carrito.' };
    }

    const { syncAbandonedCheckout } = await import('@/lib/shopify/abandoned.server');
    const result = await syncAbandonedCheckout({
      reference: data.reference,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      address: composeAddress(parsed.data),
      address1: parsed.data.address1,
      address2: parsed.data.address2,
      city: parsed.data.city,
      province: parsed.data.province,
      postalCode: parsed.data.postalCode,
      countryCode: data.countryCode,
      currency: 'USD',
      lines: priced.lines.map((line) => ({
        title: line.name,
        quantity: line.quantity,
        price: line.amountInCents / 100,
        sku: line.supVariantSku,
        variantId: line.shopifyVariantId,
      })),
    });

    return { ok: result.ok };
  });

/**
 * El cliente terminó la compra: se borra el carrito abandonado de Shopify
 * para que no quede duplicado con el pedido real.
 */
export const clearAbandonedCheckout = createServerFn({ method: 'POST' })
  .inputValidator((input: { reference: string }) => ({
    reference: String(input?.reference ?? '').slice(0, 60),
  }))
  .handler(async ({ data }): Promise<AbandonedCheckoutResponse> => {
    if (!data.reference) return { ok: false };
    const { closeAbandonedCheckout } = await import('@/lib/shopify/abandoned.server');
    const result = await closeAbandonedCheckout(data.reference);
    return { ok: result.ok };
  });
