/**
 * Configuración de checkout de la tienda.
 *
 * Tienda única (Youtumundial) alojada en Lovable. Los valores se pueden
 * sobreescribir con variables de entorno (VITE_*) sin tocar el código.
 */

const env = import.meta.env as Record<string, string | undefined>;

export const checkoutConfig = {
  /**
   * Link de pago de Mercado Pago (Checkout Pro).
   * Provisional: mientras no haya backend, se usa un link fijo generado desde
   * el panel de Mercado Pago. Con Lovable Cloud activo se reemplaza por la
   * creación dinámica de la preferencia vía API.
   */
  mercadoPagoLink: env.VITE_MERCADOPAGO_LINK ?? '',
  /** Usuario de PayPal.me (sin la @) para pagos directos. */
  paypalMe: env.VITE_PAYPAL_ME ?? '',
  /** Número asociado a Yape. */
  yapeNumber: env.VITE_YAPE_NUMBER ?? '',
  /** Número asociado a Plin. */
  plinNumber: env.VITE_PLIN_NUMBER ?? '',
  /** QR de Yape/Plin (imagen en /public o URL absoluta). */
  yapeQrUrl: env.VITE_YAPE_QR_URL ?? '',
  /** WhatsApp de la tienda en formato internacional, solo dígitos. */
  whatsapp: env.VITE_WHATSAPP_NUMBER ?? '51999999999',
  /** Nombre de la tienda (para mensajes y comprobantes). */
  storeName: env.VITE_STORE_NAME ?? 'Ropa de Youtumundial',
  /** Tipo de cambio referencial USD -> PEN para Yape/Plin. */
  usdToPen: Number(env.VITE_USD_TO_PEN ?? 3.75),
} as const;

export interface ShippingCountry {
  code: string;
  name: string;
  flag: string;
  /** Costo estimado de envío internacional en USD. */
  shipping: number;
  /** Días hábiles estimados. */
  eta: string;
  /** Mercado de Shopify al que pertenece el país. */
  market: ShippingMarketKey;
}

/**
 * Mercados de envío tal como están configurados en Shopify
 * (Shipping and delivery → Shipping options):
 *   United States → Express | Canada → Economy | Internacional → Standard
 * Cada mercado tiene su propio servicio y su propia tarifa; nunca se comparte
 * un precio único entre países.
 */
export type ShippingMarketKey = 'US' | 'CA' | 'INTL';

export interface ShippingMarket {
  key: ShippingMarketKey;
  /** Nombre del mercado en Shopify. */
  name: string;
  /** Servicio de envío que ofrece ese mercado en Shopify. */
  service: 'Express' | 'Economy' | 'Standard';
  /** Tarifa de respaldo en USD si Shopify no responde. */
  shipping: number;
  eta: string;
}

export const shippingMarkets: Record<ShippingMarketKey, ShippingMarket> = {
  US: { key: 'US', name: 'United States', service: 'Express', shipping: 14.9, eta: '5-9 días' },
  CA: { key: 'CA', name: 'Canada', service: 'Economy', shipping: 9.9, eta: '10-18 días' },
  INTL: {
    key: 'INTL',
    name: 'Internacional',
    service: 'Standard',
    shipping: 11.9,
    eta: '8-15 días',
  },
};

export function marketForCountry(countryCode: string): ShippingMarket {
  const code = (countryCode || '').toUpperCase();
  if (code === 'US') return shippingMarkets.US;
  if (code === 'CA') return shippingMarkets.CA;
  return shippingMarkets.INTL;
}

/**
 * Todos los países del mundo son destinos válidos. La tarifa y el plazo salen
 * del mercado al que pertenece cada país (EE.UU., Canadá o Internacional), y
 * el precio definitivo siempre se recalcula en el servidor contra Shopify.
 */
export const shippingCountries: ShippingCountry[] = worldCountries.map((c) => {
  const market = marketForCountry(c.code);
  return {
    code: c.code,
    name: c.name,
    flag: c.flag,
    shipping: market.shipping,
    eta: market.eta,
    market: market.key,
  };
});

const shippingByCode = new Map(shippingCountries.map((c) => [c.code, c]));

/** País de destino por código ISO; si no existe, cae al mercado internacional. */
export function shippingCountryFor(code: string): ShippingCountry {
  const key = String(code ?? '').toUpperCase().slice(0, 2);
  return (
    shippingByCode.get(key) ?? {
      code: key || 'PE',
      name: key || 'Internacional',
      flag: '🌍',
      shipping: shippingMarkets.INTL.shipping,
      eta: shippingMarkets.INTL.eta,
      market: 'INTL',
    }
  );
}

/** Destinos destacados (los que se muestran en la página de envíos). */
export const featuredCountryCodes = ['PE', 'US', 'CA', 'GB', 'ES', 'MX', 'AR', 'CL'] as const;

export const featuredShippingCountries: ShippingCountry[] = featuredCountryCodes.map((code) =>
  shippingCountryFor(code),
);

/** Umbral de envío gratis (USD). */
export const FREE_SHIPPING_THRESHOLD = 100;


