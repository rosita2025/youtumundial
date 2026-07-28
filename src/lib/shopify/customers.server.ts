/**
 * Sincronización automática de clientes con Shopify (solo servidor).
 *
 * Cada compra o carrito del checkout propio crea o actualiza el cliente en
 * Shopify (Clientes → Customers) con su correo, nombre, teléfono y dirección,
 * para que los correos automáticos de la tienda (confirmación, envío,
 * recuperación de carrito) salgan desde Shopify.
 *
 * Reglas de seguridad:
 * - Nunca se expone el token ni el detalle de los errores de Shopify.
 * - Los datos se recortan y normalizan antes de enviarse.
 * - El consentimiento de marketing solo se marca si el cliente lo aceptó
 *   explícitamente en el checkout (nunca por defecto).
 */

import { adminRequest, normalizePhone, requireShopifyScope } from './admin.server';

export interface ShopifyCustomerInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  /** Solo true si la persona marcó la casilla de novedades en el checkout. */
  acceptsMarketing?: boolean;
  /** Etiquetas extra para segmentar (además de las de la tienda). */
  extraTags?: string[];
}

export interface ShopifyCustomerResult {
  ok: boolean;
  customerId?: string;
  created?: boolean;
  message?: string;
}

const CUSTOMER_BY_EMAIL = `
  query CustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      edges { node { id email } }
    }
  }
`;

const CUSTOMER_CREATE = `
  mutation CustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

const CUSTOMER_UPDATE = `
  mutation CustomerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

const clean = (value: unknown, max: number) =>
  String(value ?? '').trim().slice(0, max) || undefined;

const isEmail = (value: string) =>
  /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(value) && value.length <= 254;

function buildInput(input: ShopifyCustomerInput) {
  const email = input.email.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  const address = input.address;

  const addresses =
    address && (address.line1 || address.city)
      ? [
          {
            firstName: clean(input.firstName, 60) ?? 'Cliente',
            lastName: clean(input.lastName, 60) ?? 'Youtumundial',
            address1: clean(address.line1, 250) ?? '',
            ...(clean(address.line2, 120) ? { address2: clean(address.line2, 120) } : {}),
            ...(clean(address.city, 80) ? { city: clean(address.city, 80) } : {}),
            ...(clean(address.state, 80) ? { provinceCode: clean(address.state, 80) } : {}),
            ...(clean(address.postal_code, 16) ? { zip: clean(address.postal_code, 16) } : {}),
            ...(clean(address.country, 2)
              ? { countryCode: clean(address.country, 2)!.toUpperCase() }
              : {}),
            ...(phone ? { phone } : {}),
          },
        ]
      : undefined;

  return {
    email,
    ...(clean(input.firstName, 60) ? { firstName: clean(input.firstName, 60) } : {}),
    ...(clean(input.lastName, 60) ? { lastName: clean(input.lastName, 60) } : {}),
    ...(phone ? { phone } : {}),
    ...(addresses ? { addresses } : {}),
    tags: [
      'youtumundial-checkout',
      ...(input.extraTags ?? []).map((t) => t.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)).filter(Boolean),
    ],
    ...(input.acceptsMarketing
      ? {
          emailMarketingConsent: {
            marketingState: 'SUBSCRIBED',
            marketingOptInLevel: 'SINGLE_OPT_IN',
          },
        }
      : {}),
  };
}

/** Cache corta email → customerId, para no repetir consultas en cada paso. */
const customerCache = new Map<string, string>();

/**
 * Crea o actualiza el cliente en Shopify a partir del correo del checkout.
 *
 * Idempotente: la clave combina el correo con los datos enviados, así las
 * llamadas repetidas con la misma información (checkout + carrito abandonado +
 * pedido) no generan clientes duplicados ni actualizaciones redundantes.
 * Nunca rompe la compra: si falla, devuelve `{ ok: false }`.
 */
export async function upsertShopifyCustomer(
  input: ShopifyCustomerInput,
): Promise<ShopifyCustomerResult> {
  const email = String(input.email ?? '').trim().toLowerCase();
  if (!isEmail(email)) return { ok: false, message: 'Correo no válido.' };

  const { withIdempotency, idempotencyKey } = await import('@/lib/utils/idempotency.server');
  return withIdempotency(
    idempotencyKey('shopify-customer', email, buildInput({ ...input, email })),
    () => upsertShopifyCustomerNow({ ...input, email }),
  );
}

async function upsertShopifyCustomerNow(
  input: ShopifyCustomerInput,
): Promise<ShopifyCustomerResult> {
  const email = String(input.email).trim().toLowerCase();

  const gate = await requireShopifyScope('write_customers');
  if (!gate.ok) return { ok: false, message: gate.message };

  const payload = buildInput({ ...input, email });


  try {
    let customerId = customerCache.get(email);

    if (!customerId) {
      const found = await adminRequest<{
        customers: { edges: { node: { id: string; email: string | null } }[] };
      }>(CUSTOMER_BY_EMAIL, { query: `email:"${email.replace(/["'\\]/g, '')}"` });
      customerId = found?.customers?.edges?.[0]?.node?.id;
    }

    if (customerId) {
      const data = await adminRequest<{
        customerUpdate: {
          customer: { id: string } | null;
          userErrors: { field: string[] | null; message: string }[];
        };
      }>(CUSTOMER_UPDATE, { input: { ...payload, id: customerId } });

      const updated = data?.customerUpdate?.customer;
      if (!updated) {
        console.warn('upsertShopifyCustomer(update)', data?.customerUpdate?.userErrors);
        // El cliente existe aunque la actualización falle: lo devolvemos igual.
        customerCache.set(email, customerId);
        return { ok: true, customerId, created: false };
      }
      customerCache.set(email, updated.id);
      return { ok: true, customerId: updated.id, created: false };
    }

    const data = await adminRequest<{
      customerCreate: {
        customer: { id: string } | null;
        userErrors: { field: string[] | null; message: string }[];
      };
    }>(CUSTOMER_CREATE, { input: payload });

    const created = data?.customerCreate?.customer;
    if (!created) {
      const errors = data?.customerCreate?.userErrors ?? [];
      console.error('upsertShopifyCustomer(create)', errors);
      // Carrera: si otro proceso lo creó primero, lo buscamos de nuevo.
      const retry = await adminRequest<{
        customers: { edges: { node: { id: string } }[] };
      }>(CUSTOMER_BY_EMAIL, { query: `email:"${email.replace(/["'\\]/g, '')}"` }).catch(() => null);
      const existing = retry?.customers?.edges?.[0]?.node?.id;
      if (existing) {
        customerCache.set(email, existing);
        return { ok: true, customerId: existing, created: false };
      }
      return { ok: false, message: 'No se pudo registrar el cliente en Shopify.' };
    }

    customerCache.set(email, created.id);
    return { ok: true, customerId: created.id, created: true };
  } catch (error) {
    console.error('upsertShopifyCustomer', (error as Error).message);
    return { ok: false, message: 'No se pudo sincronizar el cliente con Shopify.' };
  }
}
