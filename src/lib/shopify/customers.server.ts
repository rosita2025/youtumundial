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

  const { recordSync } = await import('@/lib/observability/sync-audit.server');
  const startedAt = Date.now();

  const gate = await requireShopifyScope('write_customers');
  if (!gate.ok) {
    await recordSync({
      entity: 'customer', action: 'upsert', status: 'skipped',
      email, cause: gate.message,
    });
    return { ok: false, message: gate.message };
  }

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
        const cause =
          (data?.customerUpdate?.userErrors ?? []).map((e) => e.message).join(', ') ||
          'Shopify rechazó la actualización del cliente.';
        // Shopify rechazó la actualización: se audita pero no bloqueamos.
        // Reintentamos sin dirección si el error parece de validación postal/provincia.
        const needsAddressRetry = (data?.customerUpdate?.userErrors ?? []).some(
          (e) => (e.field ?? []).some(f => ['zip', 'province', 'country', 'city'].includes(f.toLowerCase()))
        );

        await recordSync({
          entity: 'customer', action: 'update', status: needsAddressRetry ? 'skipped' : 'rejected',
          email, ids: { customerId }, cause, durationMs: Date.now() - startedAt,
        });

        if (needsAddressRetry) {
          const retryPayload = { ...payload, addresses: undefined };
          await adminRequest(CUSTOMER_UPDATE, { input: { ...retryPayload, id: customerId } }).catch(e => {
            console.warn('upsertShopifyCustomer(retry-update)', e.message);
          });
        }
        // El cliente existe aunque la actualización falle: lo devolvemos igual.
        customerCache.set(email, customerId);
        return { ok: true, customerId, created: false };
      }
      customerCache.set(email, updated.id);
      await recordSync({
        entity: 'customer', action: 'update', status: 'ok',
        email, ids: { customerId: updated.id }, durationMs: Date.now() - startedAt,
      });
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
      const createErrors = data?.customerCreate?.userErrors ?? [];
      const cause = createErrors.map((e) => e.message).join(', ') || 'Error desconocido';
      console.error('upsertShopifyCustomer(create)', createErrors);

      // Si falló por dirección, reintentamos crear sin dirección antes de rendirnos.
      const isAddressError = createErrors.some((e) =>
        (e.field ?? []).some((f) => ['zip', 'province', 'country', 'city', 'addresses'].includes(f.toLowerCase()))
      );

      if (isAddressError) {
        const retryData = await adminRequest<{
          customerCreate: {
            customer: { id: string } | null;
            userErrors: { field: string[] | null; message: string }[];
          };
        }>(CUSTOMER_CREATE, { input: { ...payload, addresses: undefined } }).catch(() => null);

        if (retryData?.customerCreate?.customer) {
          const id = retryData.customerCreate.customer.id;
          customerCache.set(email, id);
          await recordSync({
            entity: 'customer', action: 'create', status: 'ok',
            email, ids: { customerId: id }, cause: 'Creado tras reintento sin dirección.',
            durationMs: Date.now() - startedAt,
          });
          return { ok: true, customerId: id, created: true };
        }
      }

      // Carrera: si otro proceso lo creó primero, lo buscamos de nuevo.
      const retry = await adminRequest<{
        customers: { edges: { node: { id: string } }[] };
      }>(CUSTOMER_BY_EMAIL, { query: `email:"${email.replace(/["'\\]/g, '')}"` }).catch(() => null);
      const existing = retry?.customers?.edges?.[0]?.node?.id;
      if (existing) {
        customerCache.set(email, existing);
        await recordSync({
          entity: 'customer', action: 'create', status: 'ok',
          email, ids: { customerId: existing }, cause: 'Ya existía (carrera resuelta).',
          durationMs: Date.now() - startedAt, silent: true,
        });
        return { ok: true, customerId: existing, created: false };
      }

      await recordSync({
        entity: 'customer', action: 'create', status: 'rejected',
        email,
        cause: cause || 'Shopify rechazó la creación del cliente.',
        durationMs: Date.now() - startedAt,
      });
      return { ok: false, message: 'No se pudo registrar el cliente en Shopify.' };
    }

    customerCache.set(email, created.id);
    await recordSync({
      entity: 'customer', action: 'create', status: 'ok',
      email, ids: { customerId: created.id }, durationMs: Date.now() - startedAt,
    });
    return { ok: true, customerId: created.id, created: true };
  } catch (error) {
    await recordSync({
      entity: 'customer', action: 'upsert', status: 'error',
      email, cause: (error as Error).message, durationMs: Date.now() - startedAt,
    });
    return { ok: false, message: 'No se pudo sincronizar el cliente con Shopify.' };
  }
}
