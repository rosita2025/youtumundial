/**
 * Shopify Admin API (solo servidor).
 *
 * Se usa para registrar en Shopify los pedidos que se cobran con el checkout
 * propio (Stripe), así el inventario y los reportes de la tienda quedan al día.
 *
 * El token vive en `SHOPIFY_ACCESS_TOKEN` y nunca sale del servidor. Si la app
 * privada no tiene permiso `write_orders`, la función no rompe la compra:
 * devuelve `{ ok: false }` y el pedido igual queda cobrado y despachado.
 */

import {
  SHOPIFY_API_VERSION,
  SHOPIFY_STORE_PERMANENT_DOMAIN,
} from './storefront';
import { assertAllowedShopifyUrl } from '../security/connection-audit';

const ADMIN_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

async function adminRequest<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!token) throw new Error('SHOPIFY_ACCESS_TOKEN no está configurado');

  assertAllowedShopifyUrl(ADMIN_URL);

  const response = await fetch(ADMIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) throw new Error(`Shopify Admin HTTP ${response.status}`);
  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(`Shopify Admin: ${json.errors.map((e) => e.message).join(', ')}`);
  }
  return json.data as T;
}

const ORDER_CREATE = `
  mutation OrderCreate($order: OrderCreateOrderInput!) {
    orderCreate(order: $order) {
      order { id name }
      userErrors { field message }
    }
  }
`;

export interface ShopifyOrderInput {
  reference: string;
  email?: string;
  name?: string;
  phone?: string;
  currency: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  lines: {
    title: string;
    quantity: number;
    /** Precio unitario en la moneda del pedido. */
    price: number;
    sku?: string;
  }[];
  note?: string;
}

export interface ShopifyOrderResult {
  ok: boolean;
  orderId?: string;
  orderName?: string;
  message?: string;
}

/** Registra el pedido pagado en Shopify (no cobra: el cobro ya lo hizo Stripe). */
export async function createShopifyOrder(
  input: ShopifyOrderInput,
): Promise<ShopifyOrderResult> {
  const [firstName, ...rest] = String(input.name ?? '').trim().split(/\s+/);
  const shippingAddress = input.address
    ? {
        firstName: firstName || 'Cliente',
        lastName: rest.join(' ') || 'Youtumundial',
        address1: input.address.line1 ?? '',
        address2: input.address.line2 ?? '',
        city: input.address.city ?? '',
        provinceCode: input.address.state ?? undefined,
        zip: input.address.postal_code ?? '',
        countryCode: input.address.country ?? undefined,
        phone: input.phone || undefined,
      }
    : undefined;

  const order = {
    email: input.email || undefined,
    phone: input.phone || undefined,
    tags: ['youtumundial-checkout', 'stripe', referenceTag(input.reference)],
    note: input.note ?? `Pedido del checkout propio · ${input.reference}`,
    financialStatus: 'PAID',
    ...(shippingAddress && { shippingAddress, billingAddress: shippingAddress }),
    lineItems: input.lines.map((line) => ({
      title: line.title.slice(0, 250),
      quantity: line.quantity,
      sku: line.sku || undefined,
      priceSet: {
        shopMoney: { amount: line.price.toFixed(2), currencyCode: input.currency },
      },
    })),
  };

  try {
    const data = await adminRequest<{
      orderCreate: {
        order: { id: string; name: string } | null;
        userErrors: { field: string[] | null; message: string }[];
      };
    }>(ORDER_CREATE, { order });

    const errors = data?.orderCreate?.userErrors ?? [];
    if (errors.length) {
      console.error('createShopifyOrder userErrors', input.reference, errors);
      return { ok: false, message: errors.map((e) => e.message).join(', ') };
    }
    const created = data?.orderCreate?.order;
    if (!created) return { ok: false, message: 'Shopify no devolvió el pedido.' };
    return { ok: true, orderId: created.id, orderName: created.name };
  } catch (error) {
    // El detalle queda en los logs del servidor: no rompemos la compra.
    console.error('createShopifyOrder', input.reference, (error as Error).message);
    return { ok: false, message: 'No se pudo registrar el pedido en Shopify.' };
  }
}

/** Etiqueta única del pedido: permite encontrarlo de nuevo y no duplicarlo. */
function referenceTag(reference: string) {
  return `ref-${reference.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60)}`;
}

const ORDER_BY_TAG = `
  query OrderByTag($query: String!) {
    orders(first: 1, query: $query) {
      edges { node { id name } }
    }
  }
`;

/**
 * Busca un pedido ya creado con la misma referencia.
 * Es la red de seguridad de los reintentos: si el pedido existe, no se crea otro.
 */
export async function findShopifyOrderByReference(
  reference: string,
): Promise<ShopifyOrderResult | null> {
  try {
    const data = await adminRequest<{
      orders: { edges: { node: { id: string; name: string } }[] };
    }>(ORDER_BY_TAG, { query: `tag:'${referenceTag(reference)}'` });
    const node = data?.orders?.edges?.[0]?.node;
    return node ? { ok: true, orderId: node.id, orderName: node.name } : null;
  } catch (error) {
    // Sin permiso `read_orders` no podemos verificar: lo tratamos como "no existe".
    console.warn('findShopifyOrderByReference', reference, (error as Error).message);
    return null;
  }
}

/**
 * Crea el pedido en Shopify con reintentos automáticos y sin duplicar:
 * antes de cada intento comprueba si ya existe un pedido con esa referencia.
 */
export async function createShopifyOrderIdempotent(
  input: ShopifyOrderInput,
): Promise<ShopifyOrderResult> {
  const existing = await findShopifyOrderByReference(input.reference);
  if (existing) return existing;

  const { withRetry } = await import('@/lib/utils/retry');
  try {
    return await withRetry(
      async (attempt) => {
        if (attempt > 1) {
          const already = await findShopifyOrderByReference(input.reference);
          if (already) return already;
        }
        const result = await createShopifyOrder(input);
        if (!result.ok) throw new Error(result.message ?? 'Shopify rechazó el pedido');
        return result;
      },
      { attempts: 3, baseDelayMs: 800, label: `createShopifyOrder ${input.reference}` },
    );
  } catch (error) {
    const late = await findShopifyOrderByReference(input.reference);
    if (late) return late;
    return { ok: false, message: (error as Error).message };
  }
}


/* ------------------------------------------------------------------ */
/* Permisos (scopes) de la app privada de Shopify                      */
/* ------------------------------------------------------------------ */

/** Permisos mínimos que necesita la tienda propia. */
export const REQUIRED_SHOPIFY_SCOPES = [
  'read_products',
  'read_orders',
  'write_orders',
] as const;

const APP_SCOPES = `
  query AppScopes {
    currentAppInstallation {
      accessScopes { handle }
    }
  }
`;

export interface ShopifyScopeReport {
  ok: boolean;
  configured: boolean;
  granted: string[];
  missing: string[];
  message?: string;
}

/**
 * Consulta a Shopify qué permisos tiene realmente el token del servidor.
 * No expone el token: solo devuelve la lista de scopes concedidos y faltantes.
 */
export async function checkShopifyAdminScopes(): Promise<ShopifyScopeReport> {
  if (!process.env.SHOPIFY_ACCESS_TOKEN) {
    return {
      ok: false,
      configured: false,
      granted: [],
      missing: [...REQUIRED_SHOPIFY_SCOPES],
      message: 'SHOPIFY_ACCESS_TOKEN no está configurado en el servidor.',
    };
  }

  try {
    const data = await adminRequest<{
      currentAppInstallation: { accessScopes: { handle: string }[] } | null;
    }>(APP_SCOPES);

    const granted = (data?.currentAppInstallation?.accessScopes ?? []).map((s) => s.handle);
    const missing = REQUIRED_SHOPIFY_SCOPES.filter((scope) => !granted.includes(scope));
    return {
      ok: missing.length === 0,
      configured: true,
      granted,
      missing,
      message: missing.length
        ? `Faltan permisos en la app privada de Shopify: ${missing.join(', ')}`
        : undefined,
    };
  } catch (error) {
    console.error('checkShopifyAdminScopes', (error as Error).message);
    return {
      ok: false,
      configured: true,
      granted: [],
      missing: [...REQUIRED_SHOPIFY_SCOPES],
      message: 'No se pudo verificar los permisos del Admin API de Shopify.',
    };
  }
}

/** Cache corta para no consultar los permisos en cada pedido. */
let scopeCache: { at: number; report: ShopifyScopeReport } | null = null;

export async function ensureShopifyScopes(): Promise<ShopifyScopeReport> {
  if (scopeCache && Date.now() - scopeCache.at < 5 * 60_000) return scopeCache.report;
  const report = await checkShopifyAdminScopes();
  scopeCache = { at: Date.now(), report };
  return report;
}
