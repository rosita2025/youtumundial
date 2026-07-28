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
import {
  resolveShopifyAdminToken,
  resetShopifyAdminToken,
  hasShopifyClientCredentials,
} from './admin-auth.server';

const ADMIN_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

/**
 * Token del Admin API (solo servidor).
 *
 * Prioriza `SHOPIFY_ADMIN_ORDERS_TOKEN`, luego el token temporal obtenido con
 * `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` (client_credentials) y por
 * último el token de la integración. Nunca se envía al navegador.
 */
function adminToken(): Promise<string | undefined> {
  return resolveShopifyAdminToken();
}

export function hasShopifyAdminCredentials(): boolean {
  return Boolean(
    process.env.SHOPIFY_ADMIN_ORDERS_TOKEN?.trim() ||
      process.env.SHOPIFY_ACCESS_TOKEN?.trim() ||
      hasShopifyClientCredentials(),
  );
}

async function adminRequest<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
  retry = true,
): Promise<T> {
  const token = await adminToken();
  if (!token) throw new Error('Credenciales de Shopify Admin no configuradas');

  assertAllowedShopifyUrl(ADMIN_URL);

  const response = await fetch(ADMIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 401 || response.status === 403) {
    // Token temporal caducado o revocado: renovamos una sola vez.
    resetShopifyAdminToken();
    if (retry) return adminRequest<T>(query, variables, false);
    throw new Error(`Shopify Admin HTTP ${response.status}`);
  }

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
    /** GID de la variante real de Shopify, si ya se conoce. */
    variantId?: string;
  }[];

  note?: string;
  /** Estado de pago del pedido en Shopify. Por defecto PAID (cobro ya hecho). */
  financialStatus?: 'PAID' | 'PENDING';
  /** Etiquetas extra (además de las de la tienda y la referencia). */
  extraTags?: string[];
}


export interface ShopifyOrderResult {
  ok: boolean;
  orderId?: string;
  orderName?: string;
  message?: string;
}

/**
 * Normaliza el teléfono a formato E.164.
 * Shopify rechaza el pedido entero ("Phone is invalid") si el número no es
 * válido, así que si no cumple el formato lo omitimos en vez de fallar.
 */
function normalizePhone(raw?: string): string | undefined {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!digits) return undefined;
  const e164 = digits.startsWith('+') ? `+${digits.slice(1).replace(/\D/g, '')}` : undefined;
  if (!e164) return undefined;
  const numeric = e164.slice(1);
  if (numeric.length < 8 || numeric.length > 15) return undefined;
  return e164;
}

/** Registra el pedido pagado en Shopify (no cobra: el cobro ya lo hizo Stripe). */
export async function createShopifyOrder(
  input: ShopifyOrderInput,
): Promise<ShopifyOrderResult> {
  // Verificación automática de permisos antes de cualquier acción de pedido.
  const gate = await requireShopifyScope('write_orders');
  if (!gate.ok) return { ok: false, message: gate.message };

  const [firstName, ...rest] = String(input.name ?? '').trim().split(/\s+/);
  const phone = normalizePhone(input.phone);

  const buildOrder = (opts: { withPhone: boolean; withAddress: boolean }) => {
    const shippingAddress =
      input.address && opts.withAddress
        ? {
            firstName: firstName || 'Cliente',
            lastName: rest.join(' ') || 'Youtumundial',
            address1: input.address.line1 ?? '',
            address2: input.address.line2 ?? '',
            city: input.address.city ?? '',
            provinceCode: input.address.state ?? undefined,
            zip: input.address.postal_code ?? '',
            countryCode: input.address.country ?? undefined,
            ...(opts.withPhone && phone ? { phone } : {}),
          }
        : undefined;

    return {
      email: input.email || undefined,
      ...(opts.withPhone && phone ? { phone } : {}),
      tags: [
        'youtumundial-checkout',
        ...(input.extraTags?.length ? input.extraTags : ['stripe']),
        referenceTag(input.reference),
      ],
      note: input.note ?? `Pedido del checkout propio · ${input.reference}`,
      financialStatus: input.financialStatus ?? 'PAID',

      ...(shippingAddress && { shippingAddress, billingAddress: shippingAddress }),
      lineItems: input.lines.map((line) => ({
        title: line.title.slice(0, 250),
        quantity: line.quantity,
        sku: line.sku || undefined,
        priceSet: {
          shopMoney: {
            amount: line.price.toFixed(2),
            currencyCode: (input.currency || 'USD').toUpperCase(),
          },
        },
      })),
    };
  };

  const send = async (order: ReturnType<typeof buildOrder>) => {
    const data = await adminRequest<{
      orderCreate: {
        order: { id: string; name: string } | null;
        userErrors: { field: string[] | null; message: string }[];
      };
    }>(ORDER_CREATE, { order });
    return {
      created: data?.orderCreate?.order ?? null,
      errors: data?.orderCreate?.userErrors ?? [],
    };
  };

  try {
    // Intento 1: pedido completo.
    let attemptOpts = { withPhone: Boolean(phone), withAddress: true };
    let { created, errors } = await send(buildOrder(attemptOpts));

    // Reintento automático degradando el dato que Shopify rechazó,
    // para que el pedido siempre quede registrado con su número.
    const failedOn = (needle: string) =>
      errors.some(
        (e) =>
          (e.field ?? []).some((f) => f.toLowerCase().includes(needle)) ||
          e.message.toLowerCase().includes(needle),
      );

    if (!created && errors.length && (failedOn('phone') || attemptOpts.withPhone)) {
      attemptOpts = { withPhone: false, withAddress: true };
      ({ created, errors } = await send(buildOrder(attemptOpts)));
    }

    if (!created && errors.length && (failedOn('address') || failedOn('zip') || failedOn('province') || failedOn('country'))) {
      attemptOpts = { withPhone: false, withAddress: false };
      ({ created, errors } = await send(buildOrder(attemptOpts)));
    }

    if (!created) {
      console.error('createShopifyOrder userErrors', input.reference, errors);
      return {
        ok: false,
        message: errors.length
          ? errors.map((e) => e.message).join(', ')
          : 'Shopify no devolvió el pedido.',
      };
    }

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
  // Sin permiso de lectura de pedidos no se consulta nada.
  const gate = await requireShopifyScope('read_orders');
  if (!gate.ok) return null;

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
  // Verificación automática de permisos (lectura + creación de pedidos).
  const gate = await requireShopifyOrderAccess();
  if (!gate.ok) return { ok: false, message: gate.message };


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
  if (!hasShopifyAdminCredentials()) {
    return {
      ok: false,
      configured: false,
      granted: [],
      missing: [...REQUIRED_SHOPIFY_SCOPES],
      message: 'Faltan credenciales de Shopify Admin en el servidor.',
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

/** Éxito: 5 min. Fallo: 60 s, para reaccionar rápido si reautorizas la app. */
function scopeCacheTtl(report: ShopifyScopeReport) {
  return report.ok ? 5 * 60_000 : 60_000;
}

export async function ensureShopifyScopes(): Promise<ShopifyScopeReport> {
  if (scopeCache && Date.now() - scopeCache.at < scopeCacheTtl(scopeCache.report)) {
    return scopeCache.report;
  }
  const report = await checkShopifyAdminScopes();
  scopeCache = { at: Date.now(), report };
  return report;
}

/** Invalida la cache de permisos (tras reautorizar la app en Shopify). */
export function resetShopifyScopeCache() {
  scopeCache = null;
}

export interface ShopifyScopeGate {
  ok: boolean;
  missing: string[];
  message?: string;
}

/**
 * Verificación automática de un permiso concreto antes de una acción de pedido.
 * Nunca expone el token ni detalles internos: solo el permiso que falta.
 */
export async function requireShopifyScope(
  scope: (typeof REQUIRED_SHOPIFY_SCOPES)[number],
): Promise<ShopifyScopeGate> {
  const report = await ensureShopifyScopes();
  if (!report.configured) {
    return {
      ok: false,
      missing: [scope],
      message: 'La integración de Shopify no está configurada en el servidor.',
    };
  }
  if (report.missing.includes(scope)) {
    return {
      ok: false,
      missing: [scope],
      message: `La app de Shopify no tiene el permiso "${scope}".`,
    };
  }
  // Si no se pudo verificar (granted vacío por error de red/permiso), bloqueamos.
  if (!report.ok && report.granted.length === 0) {
    return {
      ok: false,
      missing: [scope],
      message: 'No se pudieron verificar los permisos de pedidos en Shopify.',
    };
  }
  return { ok: true, missing: [] };
}

/** Exige lectura y creación de pedidos antes de tocar pedidos en Shopify. */
export async function requireShopifyOrderAccess(): Promise<ShopifyScopeGate> {
  const report = await ensureShopifyScopes();
  const needed = ['read_orders', 'write_orders'] as const;

  if (!report.configured) {
    return {
      ok: false,
      missing: [...needed],
      message: 'La integración de Shopify no está configurada en el servidor.',
    };
  }

  const missing = needed.filter(
    (scope) => report.missing.includes(scope) || report.granted.length === 0,
  );
  if (missing.length) {
    return {
      ok: false,
      missing,
      message: `Faltan permisos de pedidos en Shopify: ${missing.join(', ')}.`,
    };
  }
  return { ok: true, missing: [] };
}

