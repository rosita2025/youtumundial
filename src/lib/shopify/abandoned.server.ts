/**
 * Carritos abandonados del checkout propio → Shopify (solo servidor).
 *
 * Cuando el cliente completa el formulario (correo, teléfono, país y
 * dirección) pero no termina de pagar, guardamos ese checkout en Shopify como
 * *borrador de pedido* (Orders → Drafts) con la etiqueta `carrito-abandonado`.
 * Shopify permite enviarle desde ahí el enlace de recuperación, igual que un
 * "abandoned checkout" nativo (esos no se pueden crear por API).
 *
 * Reglas de seguridad:
 * - Los precios NUNCA vienen del navegador: se recalculan con el catálogo real.
 * - El token del Admin API nunca sale del servidor.
 * - Si la app no tiene permiso de borradores, se ignora en silencio: jamás
 *   rompe la compra ni expone detalles internos al cliente.
 */

import { adminRequest, normalizePhone, ensureShopifyScopes } from './admin.server';

const DRAFT_CREATE = `
  mutation DraftCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id name invoiceUrl }
      userErrors { field message }
    }
  }
`;

const DRAFT_UPDATE = `
  mutation DraftUpdate($id: ID!, $input: DraftOrderInput!) {
    draftOrderUpdate(id: $id, input: $input) {
      draftOrder { id name }
      userErrors { field message }
    }
  }
`;

const DRAFT_DELETE = `
  mutation DraftDelete($input: DraftOrderDeleteInput!) {
    draftOrderDelete(input: $input) {
      deletedId
      userErrors { field message }
    }
  }
`;

const DRAFT_BY_TAG = `
  query DraftByTag($query: String!) {
    draftOrders(first: 1, query: $query) {
      edges { node { id name } }
    }
  }
`;

export interface AbandonedLine {
  title: string;
  quantity: number;
  /** Precio unitario ya validado en el servidor. */
  price: number;
  sku?: string;
  variantId?: string;
}

export interface AbandonedCheckoutInput {
  /** Referencia estable del intento de compra (una por sesión de checkout). */
  reference: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
  currency?: string;
  lines: AbandonedLine[];
}

export interface AbandonedResult {
  ok: boolean;
  draftId?: string;
  message?: string;
}

function abandonedTag(reference: string) {
  return `abandonado-${reference.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60)}`;
}

/** El permiso de borradores es opcional: sin él simplemente no sincronizamos. */
async function canWriteDrafts(): Promise<boolean> {
  try {
    const report = await ensureShopifyScopes();
    if (!report.configured || report.granted.length === 0) return false;
    return report.granted.includes('write_draft_orders');
  } catch {
    return false;
  }
}

async function findDraftByReference(reference: string): Promise<string | undefined> {
  try {
    const data = await adminRequest<{
      draftOrders: { edges: { node: { id: string } }[] };
    }>(DRAFT_BY_TAG, { query: `tag:'${abandonedTag(reference)}'` });
    return data?.draftOrders?.edges?.[0]?.node?.id;
  } catch {
    return undefined;
  }
}

function buildDraftInput(input: AbandonedCheckoutInput) {
  const phone = normalizePhone(input.phone);
  const currency = (input.currency || 'USD').toUpperCase();
  const firstName = (input.firstName || 'Cliente').slice(0, 60);
  const lastName = (input.lastName || 'Youtumundial').slice(0, 60);

  const street = (input.address1 || input.address || '').slice(0, 250);
  const shippingAddress = street
    ? {
        firstName,
        lastName,
        address1: street,
        ...(input.address2 ? { address2: input.address2.slice(0, 120) } : {}),
        ...(input.city ? { city: input.city.slice(0, 80) } : {}),
        ...(input.province ? { province: input.province.slice(0, 80) } : {}),
        ...(input.postalCode ? { zip: input.postalCode.slice(0, 12) } : {}),
        countryCode: (input.countryCode || '').toUpperCase() || undefined,
        ...(phone ? { phone } : {}),
      }
    : undefined;

  return {
    email: input.email || undefined,
    ...(phone ? { phone } : {}),
    tags: ['youtumundial-checkout', 'carrito-abandonado', abandonedTag(input.reference)],
    note:
      `Carrito abandonado del checkout propio · ${input.reference}` +
      (input.countryCode ? ` · país ${input.countryCode}` : ''),
    ...(shippingAddress ? { shippingAddress, billingAddress: shippingAddress } : {}),
    lineItems: input.lines.map((line) => {
      const isRealVariant = Boolean(line.variantId?.startsWith('gid://shopify/ProductVariant/'));
      if (isRealVariant) {
        return { variantId: line.variantId, quantity: line.quantity };
      }
      return {
        title: line.title.slice(0, 250),
        sku: line.sku || undefined,
        requiresShipping: true,
        quantity: line.quantity,
        originalUnitPriceWithCurrency: {
          amount: line.price.toFixed(2),
          currencyCode: currency,
        },
      };
    }),
  };
}

/** Errores que sí vale la pena reintentar (red, límite de tasa, 5xx de Shopify). */
function isRetryable(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes('throttl') ||
    m.includes('rate limit') ||
    m.includes('timeout') ||
    m.includes('network') ||
    m.includes('fetch failed') ||
    m.includes('econn') ||
    m.includes('temporar') ||
    /\b(429|500|502|503|504)\b/.test(m)
  );
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Crea o actualiza el carrito abandonado en Shopify.
 *
 * Doble protección contra duplicados:
 *  - Clave de idempotencia por referencia + contenido: las llamadas repetidas
 *    del checkout (debounce, reintentos, reenvíos) no crean varios borradores.
 *  - Búsqueda del borrador existente por etiqueta antes de crear.
 * Ante fallos transitorios reintenta hasta 3 veces con espera creciente y, si
 * aun así falla, deja la causa en el log y avisa al administrador.
 */
export async function syncAbandonedCheckout(
  input: AbandonedCheckoutInput,
): Promise<AbandonedResult> {
  if (!input.email || input.lines.length === 0) {
    return { ok: false, message: 'Datos insuficientes.' };
  }

  const { withIdempotency, idempotencyKey } = await import('@/lib/utils/idempotency.server');
  return withIdempotency(idempotencyKey('shopify-draft', input.reference, input), () =>
    syncAbandonedCheckoutNow(input),
  );
}

async function syncAbandonedCheckoutNow(
  input: AbandonedCheckoutInput,
): Promise<AbandonedResult> {

  if (!(await canWriteDrafts())) {
    const message = 'La app de Shopify no tiene el permiso "write_draft_orders".';
    const { alertAdmin } = await import('@/lib/notifications/admin-alert.server');
    await alertAdmin({
      key: 'draft-orders-scope',
      title: 'Carritos abandonados sin sincronizar (permiso faltante)',
      cause: message,
      context: { referencia: input.reference },
    });
    return { ok: false, message };
  }

  // Sincroniza el correo del comprador con Clientes de Shopify aunque el
  // carrito quede abandonado (permite recuperación por correo desde Shopify).
  try {
    const { upsertShopifyCustomer } = await import('./customers.server');
    await upsertShopifyCustomer({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      address: {
        line1: input.address1 || input.address,
        line2: input.address2,
        city: input.city,
        state: input.province,
        postal_code: input.postalCode,
        country: input.countryCode,
      },
      extraTags: ['carrito-abandonado'],
    });
  } catch (error) {
    console.warn('syncAbandonedCheckout(customer)', (error as Error).message);
  }

  const draftInput = buildDraftInput(input);
  let lastCause = 'Motivo desconocido.';
  let operation: 'crear' | 'actualizar' = 'crear';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const existing = await findDraftByReference(input.reference);
      operation = existing ? 'actualizar' : 'crear';

      if (existing) {
        const data = await adminRequest<{
          draftOrderUpdate: {
            draftOrder: { id: string } | null;
            userErrors: { message: string }[];
          };
        }>(DRAFT_UPDATE, { id: existing, input: draftInput });
        const errors = data?.draftOrderUpdate?.userErrors ?? [];
        if (!errors.length) return { ok: true, draftId: existing };
        lastCause = errors.map((e) => e.message).join(', ') || 'Rechazado por Shopify.';
        // userErrors son de validación: reintentar no cambia el resultado.
        break;
      }

      const data = await adminRequest<{
        draftOrderCreate: {
          draftOrder: { id: string } | null;
          userErrors: { message: string }[];
        };
      }>(DRAFT_CREATE, { input: draftInput });
      const errors = data?.draftOrderCreate?.userErrors ?? [];
      const draft = data?.draftOrderCreate?.draftOrder;
      if (draft) return { ok: true, draftId: draft.id };
      lastCause = errors.map((e) => e.message).join(', ') || 'Rechazado por Shopify.';
      break;
    } catch (error) {
      lastCause = (error as Error).message?.slice(0, 300) || 'Error desconocido.';
      const retryable = isRetryable(lastCause) && attempt < MAX_ATTEMPTS;
      console.warn(
        `[carrito-abandonado] intento ${attempt}/${MAX_ATTEMPTS} al ${operation} el borrador ` +
          `(${input.reference}): ${lastCause}${retryable ? ' — reintentando' : ''}`,
      );
      if (!retryable) break;
      await wait(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  const { alertAdmin } = await import('@/lib/notifications/admin-alert.server');
  await alertAdmin({
    key: 'draft-orders-sync-fail',
    title: `No se pudo ${operation} el borrador de carrito abandonado`,
    cause: lastCause,
    context: {
      referencia: input.reference,
      pais: input.countryCode,
      lineas: input.lines.length,
      intentos: MAX_ATTEMPTS,
    },
  });

  // Al cliente nunca se le devuelven detalles internos.
  return { ok: false, message: 'No se pudo sincronizar el carrito abandonado.' };
}


/**
 * El cliente terminó de comprar: el carrito ya no está abandonado.
 * Borra el borrador para que no quede duplicado con el pedido real.
 * Idempotente por referencia: si el webhook de Shopify y el retorno de Stripe
 * llegan a la vez, el borrador se borra una sola vez.
 * Reintenta ante fallos transitorios y avisa al admin si no lo logra.
 */
export async function closeAbandonedCheckout(reference: string): Promise<AbandonedResult> {
  if (!reference) return { ok: false };

  const { withIdempotency, idempotencyKey } = await import('@/lib/utils/idempotency.server');
  return withIdempotency(idempotencyKey('shopify-draft-close', reference), () =>
    closeAbandonedCheckoutNow(reference),
  );
}

async function closeAbandonedCheckoutNow(reference: string): Promise<AbandonedResult> {
  if (!(await canWriteDrafts())) return { ok: false };



  let lastCause = 'Motivo desconocido.';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const existing = await findDraftByReference(reference);
      if (!existing) return { ok: true };
      await adminRequest(DRAFT_DELETE, { input: { id: existing } });
      return { ok: true };
    } catch (error) {
      lastCause = (error as Error).message?.slice(0, 300) || 'Error desconocido.';
      const retryable = isRetryable(lastCause) && attempt < MAX_ATTEMPTS;
      console.warn(
        `[carrito-abandonado] intento ${attempt}/${MAX_ATTEMPTS} al borrar el borrador ` +
          `(${reference}): ${lastCause}${retryable ? ' — reintentando' : ''}`,
      );
      if (!retryable) break;
      await wait(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  const { alertAdmin } = await import('@/lib/notifications/admin-alert.server');
  await alertAdmin({
    key: 'draft-orders-close-fail',
    title: 'No se pudo cerrar el borrador de carrito abandonado tras la compra',
    cause: lastCause,
    context: { referencia: reference, intentos: MAX_ATTEMPTS },
  });
  return { ok: false };
}

