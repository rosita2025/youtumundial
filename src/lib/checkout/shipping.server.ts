/**
 * Tarifas de envío sincronizadas desde Shopify (solo servidor).
 *
 * Shopify es la fuente de verdad de los perfiles de envío de la tienda. Acá se
 * crea un carrito temporal en la Storefront API con el país de destino para
 * leer la tarifa real (EE.UU., Canadá, Perú, Reino Unido). Si Shopify no
 * devuelve tarifa (plan sin API, zona sin configurar, producto que no vive en
 * Shopify), se cae de forma segura a la tarifa fija de `config.ts`.
 *
 * El navegador nunca decide el costo: solo pide una cotización y el importe
 * definitivo se vuelve a calcular en `pricing.server.ts` antes de cobrar.
 */

import { storefrontApiRequest } from '@/lib/shopify/storefront';
import { marketForCountry, FREE_SHIPPING_THRESHOLD, getRegionalShippingRate } from './config';

export interface ShippingQuote {
  countryCode: string;
  amount: number;
  currencyCode: string;
  title: string;
  /** true si la tarifa vino de los perfiles de envío de Shopify. */
  fromShopify: boolean;
}

/** Direcciones representativas por país para pedir la cotización a Shopify. */
const SAMPLE_ADDRESS: Record<
  string,
  { city: string; provinceCode?: string; zip: string }
> = {
  US: { city: 'Miami', provinceCode: 'FL', zip: '33101' },
  CA: { city: 'Toronto', provinceCode: 'ON', zip: 'M5H 2N2' },
  PE: { city: 'Lima', zip: '15001' },
  GB: { city: 'London', zip: 'SW1A 1AA' },
};

const CART_SHIPPING_MUTATION = `
  mutation cartShippingQuote($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        deliveryGroups(first: 5) {
          edges {
            node {
              deliveryOptions {
                title
                estimatedCost { amount currencyCode }
              }
            }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

type QuoteResponse = {
  data?: {
    cartCreate?: {
      cart?: {
        deliveryGroups?: {
          edges: Array<{
            node: {
              deliveryOptions: Array<{
                title: string;
                estimatedCost: { amount: string; currencyCode: string } | null;
              }>;
            };
          }>;
        };
      };
      userErrors?: Array<{ message: string }>;
    };
  };
};

function fallbackQuote(countryCode: string): ShippingQuote {
  const market = marketForCountry(countryCode);
  return {
    countryCode: countryCode.toUpperCase().slice(0, 2),
    amount: getRegionalShippingRate(countryCode),
    currencyCode: 'USD',
    title: `${market.name} · ${market.service}`,
    fromShopify: false,
  };
}

const cache = new Map<string, { quote: ShippingQuote; at: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Cotiza el envío de un carrito a un país. Solo usa variantes de Shopify
 * (gid://shopify/ProductVariant/...); el resto cae a la tarifa fija.
 */
export async function quoteShipping(params: {
  items: Array<{ variantId: string; quantity: number }>;
  countryCode: string;
}): Promise<ShippingQuote> {
  const countryCode = (params.countryCode || 'PE').toUpperCase().slice(0, 2);
  const lines = params.items
    .filter((i) => i.variantId.startsWith('gid://shopify/ProductVariant/'))
    .slice(0, 30)
    .map((i) => ({
      merchandiseId: i.variantId,
      quantity: Math.min(20, Math.max(1, Math.round(i.quantity) || 1)),
    }));

  if (!lines.length) return fallbackQuote(countryCode);

  const key = `${countryCode}|${lines.map((l) => `${l.merchandiseId}x${l.quantity}`).join(',')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.quote;

  // Solo algunos países tienen dirección de muestra; para el resto del mundo
  // se cotiza únicamente con el país del comprador y, si Shopify no responde,
  // se aplica la tarifa internacional fija.
  const sample = SAMPLE_ADDRESS[countryCode];


  try {
    const res = await storefrontApiRequest<QuoteResponse>(CART_SHIPPING_MUTATION, {
      input: {
        lines,
        buyerIdentity: { countryCode },
        ...(sample
          ? {
              delivery: {
                addresses: [
                  {
                    selected: true,
                    address: {
                      deliveryAddress: {
                        countryCode,
                        city: sample.city,
                        provinceCode: sample.provinceCode,
                        zip: sample.zip,
                      },
                    },
                  },
                ],
              },
            }
          : {}),
      },
    });


    const options =
      res?.data?.cartCreate?.cart?.deliveryGroups?.edges?.flatMap(
        (e) => e.node.deliveryOptions ?? [],
      ) ?? [];

    const priced = options
      .map((o) => ({
        title: o.title,
        amount: Number(o.estimatedCost?.amount ?? NaN),
        currencyCode: o.estimatedCost?.currencyCode ?? 'USD',
      }))
      .filter((o) => Number.isFinite(o.amount));

    if (!priced.length) return fallbackQuote(countryCode);

    // Cada mercado de Shopify tiene su propio servicio (EE.UU. → Express,
    // Canadá → Economy, Internacional → Standard). Elegimos la opción que
    // coincide con el servicio del mercado; si no aparece, la más económica.
    const market = marketForCountry(countryCode);
    const service = market.service.toLowerCase();
    priced.sort((a, b) => a.amount - b.amount);
    const best =
      priced.find((o) => (o.title || '').toLowerCase().includes(service)) ?? priced[0];
    const quote: ShippingQuote = {
      countryCode,
      amount: Math.round(best.amount * 100) / 100,
      currencyCode: best.currencyCode,
      title: best.title ? `${market.name} · ${best.title}` : `${market.name} · ${market.service}`,
      fromShopify: true,
    };
    cache.set(key, { quote, at: Date.now() });
    return quote;
  } catch (error) {
    // No exponemos el detalle al cliente: queda en los logs del servidor.
    console.error('Shopify shipping quote failed:', (error as Error).message);
    return fallbackQuote(countryCode);
  }
}

/** Costo de envío final aplicando envío gratis y cupones. */
export async function resolveShippingCost(params: {
  items: Array<{ variantId: string; quantity: number }>;
  countryCode: string;
  discountedSubtotal: number;
  freeShipping?: boolean;
}): Promise<number> {
  if (params.freeShipping) return 0;
  if (params.discountedSubtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  const quote = await quoteShipping({
    items: params.items,
    countryCode: params.countryCode,
  });
  return quote.amount;
}
