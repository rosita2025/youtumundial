/**
 * Cotización de envío para el checkout.
 *
 * El navegador solo manda variante + cantidad + país; el precio del envío se
 * resuelve en el servidor contra los perfiles de envío de Shopify.
 */
import { createServerFn } from '@tanstack/react-start';

export interface ShippingQuoteResult {
  amount: number;
  currencyCode: string;
  title: string;
  fromShopify: boolean;
  freeShipping: boolean;
}

export const getShippingQuote = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      items?: Array<{ variantId?: unknown; quantity?: unknown }>;
      countryCode?: unknown;
      subtotal?: unknown;
    }) => ({
      items: (Array.isArray(input?.items) ? input.items : []).slice(0, 30).map((i) => ({
        variantId: String(i?.variantId ?? '').trim().slice(0, 200),
        quantity: Math.min(20, Math.max(1, Math.round(Number(i?.quantity) || 1))),
      })),
      countryCode: String(input?.countryCode ?? 'PE').toUpperCase().slice(0, 2),
      subtotal: Math.max(0, Number(input?.subtotal) || 0),
    }),
  )
  .handler(async ({ data }): Promise<ShippingQuoteResult> => {
    const { quoteShipping } = await import('./shipping.server');
    const { FREE_SHIPPING_THRESHOLD } = await import('./config');

    if (data.subtotal >= FREE_SHIPPING_THRESHOLD) {
      return {
        amount: 0,
        currencyCode: 'USD',
        title: 'Envío gratis',
        fromShopify: false,
        freeShipping: true,
      };
    }

    const quote = await quoteShipping({
      items: data.items.filter((i) => i.variantId.length > 0),
      countryCode: data.countryCode,
    });
    return {
      amount: quote.amount,
      currencyCode: quote.currencyCode,
      title: quote.title,
      fromShopify: quote.fromShopify,
      freeShipping: false,
    };
  });
