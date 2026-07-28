import Stripe from 'stripe';

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = 'sandbox' | 'live';

const GATEWAY_STRIPE_BASE = 'https://connector-gateway.lovable.dev/stripe';

export function getConnectionApiKey(env: StripeEnv): string {
  return env === 'sandbox'
    ? getEnv('STRIPE_SANDBOX_API_KEY')
    : getEnv('STRIPE_LIVE_API_KEY');
}

export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv('LOVABLE_API_KEY');

  return new Stripe(connectionApiKey, {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace('https://api.stripe.com', GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(
              init?.headers ?? (input instanceof Request ? input.headers : undefined),
            ).entries(),
          ),
          'X-Connection-Api-Key': connectionApiKey,
          'Lovable-API-Key': lovableApiKey,
        },
      });
    }),
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const stripeError = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };

    const message = stripeError.raw?.message ?? stripeError.message;
    if (message) {
      const details = [
        stripeError.raw?.type ?? stripeError.type,
        stripeError.raw?.code ?? stripeError.code,
        stripeError.raw?.decline_code ?? stripeError.decline_code,
        stripeError.raw?.param ?? stripeError.param,
        stripeError.raw?.requestId ?? stripeError.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(', ')})` : message;
    }
  }

  return 'Stripe request failed';
}

export interface CheckoutLineInput {
  name: string;
  amountInCents: number;
  quantity: number;
  /** ID del producto en SUP Dropshipping (para crear el pedido automáticamente). */
  supProductId?: string;
  /** Variante elegida (talla / color). */
  variantTitle?: string;
  /** ID/SKU real de la variante en SUP, si viene del Member Center. */
  supVariantId?: string;
  supVariantSku?: string;
}

export interface CartCheckoutInput {
  /** Solo variante + cantidad: el precio lo calcula el servidor. */
  items: { variantId: string; quantity: number }[];
  countryCode: string;
  couponCode?: string;
  customerEmail?: string;
  returnUrl: string;
  environment: StripeEnv;
}

/** Guarda el detalle del pedido en la metadata de la sesión (máx. 500 chars por clave). */
function buildOrderMetadata(items: CheckoutLineInput[]): Record<string, string> {
  const compact = items
    .filter((i) => i.supProductId)
    .map((i) => ({
      p: i.supProductId,
      q: i.quantity,
      v: i.variantTitle ?? '',
      vid: i.supVariantId ?? '',
      sku: i.supVariantSku ?? '',
    }));
  if (!compact.length) return {};
  const json = JSON.stringify(compact);
  const chunks: Record<string, string> = {};
  for (let i = 0; i * 480 < json.length && i < 10; i++) {
    chunks[`sup_items_${i}`] = json.slice(i * 480, (i + 1) * 480);
  }
  return chunks;
}

export async function createCartSession(data: CartCheckoutInput) {
  const stripe = createStripeClient(data.environment);

  // Precios, descuento y envío se recalculan en el servidor con el catálogo real.
  const { priceOrder } = await import('@/lib/checkout/pricing.server');
  const priced = await priceOrder({
    items: data.items,
    countryCode: data.countryCode,
    couponCode: data.couponCode,
  });
  const shippingInCents = Math.round(priced.shipping * 100);

  const line_items = priced.lines.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: item.amountInCents,
    },
    quantity: item.quantity,
  }));

  if (shippingInCents > 0) {
    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Envío internacional' },
        unit_amount: shippingInCents,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    line_items,
    mode: 'payment',
    ui_mode: 'embedded_page',
    return_url: data.returnUrl,
    payment_intent_data: { description: 'Pedido Ropa de Youtumundial' },
    // Necesitamos la dirección real para despachar el pedido en SUP.
    shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
    phone_number_collection: { enabled: true },
    metadata: buildOrderMetadata(priced.lines),
    ...(data.customerEmail && { customer_email: data.customerEmail }),
  } as Parameters<Stripe['checkout']['sessions']['create']>[0]);

  return session.client_secret ?? '';
}

const SHIPPING_COUNTRIES =
  [
    'PE', 'US', 'CA', 'GB', 'MX', 'CL', 'CO', 'AR', 'EC', 'BO', 'BR', 'ES',
    'FR', 'DE', 'IT', 'PT', 'NL', 'AU', 'NZ', 'JP',
  ];

export interface StripeOrderSnapshot {
  paid: boolean;
  supOrderId?: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  items: { supProductId: string; quantity: number; variantTitle: string; supVariantId?: string; supVariantSku?: string }[];
  amountTotal: number;
}

/** Lee una sesión de Stripe y arma el snapshot del pedido para enviarlo a SUP. */
export async function readOrderSnapshot(
  sessionId: string,
  env: StripeEnv,
): Promise<StripeOrderSnapshot> {
  const stripe = createStripeClient(env);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const metadata = (session.metadata ?? {}) as Record<string, string>;

  let json = '';
  for (let i = 0; i < 10; i++) json += metadata[`sup_items_${i}`] ?? '';
  let items: StripeOrderSnapshot['items'] = [];
  if (json) {
    try {
      items = (JSON.parse(json) as { p: string; q: number; v: string; vid?: string; sku?: string }[]).map((i) => ({
        supProductId: String(i.p),
        quantity: Number(i.q) || 1,
        variantTitle: String(i.v ?? ''),
        supVariantId: i.vid ? String(i.vid) : undefined,
        supVariantSku: i.sku ? String(i.sku) : undefined,
      }));
    } catch {
      items = [];
    }
  }

  const shipping =
    (session as unknown as {
      collected_information?: { shipping_details?: { name?: string; address?: Record<string, string> } };
      shipping_details?: { name?: string; address?: Record<string, string> };
    }).collected_information?.shipping_details ??
    (session as unknown as { shipping_details?: { name?: string; address?: Record<string, string> } })
      .shipping_details;

  return {
    paid: session.payment_status === 'paid',
    supOrderId: metadata.sup_order_id || undefined,
    email: session.customer_details?.email ?? undefined,
    name: shipping?.name ?? session.customer_details?.name ?? undefined,
    phone: session.customer_details?.phone ?? undefined,
    address: (shipping?.address ?? session.customer_details?.address ?? undefined) as
      | StripeOrderSnapshot['address']
      | undefined,
    items,
    amountTotal: (session.amount_total ?? 0) / 100,
  };
}

/** Marca la sesión con el ID del pedido creado en SUP (idempotencia sin base de datos). */
export async function markSessionFulfilled(sessionId: string, env: StripeEnv, supOrderId: string) {
  const stripe = createStripeClient(env);
  await stripe.checkout.sessions.update(sessionId, { metadata: { sup_order_id: supOrderId } });
}

