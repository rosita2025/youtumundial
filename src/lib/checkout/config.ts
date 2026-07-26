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
}

export const shippingCountries: ShippingCountry[] = [
  { code: 'PE', name: 'Perú', flag: '🇵🇪', shipping: 5, eta: '5-10 días' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', shipping: 9, eta: '8-15 días' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', shipping: 12, eta: '10-18 días' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', shipping: 12, eta: '10-18 días' },
];

/** Umbral de envío gratis (USD). */
export const FREE_SHIPPING_THRESHOLD = 100;
