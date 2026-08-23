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
  const firstName = (input.firstName || 'Customer').slice(0, 60);
  const lastName = (input.lastName || 'Customer').slice(0, 60);

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
    tags: ['youtumundial-custom-checkout', 'abandoned-cart', abandonedTag(input.reference)],
    note:
      `Abandoned cart from custom checkout · ${input.reference}` +
      (input.countryCode ? ` · country ${input.countryCode}` : ''),
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
    return { ok: false, message: 'Insufficient data.' };
  }

  const { withIdempotency, idempotencyKey } = await import('@/lib/utils/idempotency.server');
  return withIdempotency(idempotencyKey('shopify-draft', input.reference, input), () =>
    syncAbandonedCheckoutNow(input),
  );
}

async function syncAbandonedCheckoutNow(
  input: AbandonedCheckoutInput,
): Promise<AbandonedResult> {
  const { recordSync } = await import('@/lib/observability/sync-audit.server');
  const startedAt = Date.now();

  if (!(await canWriteDrafts())) {
    const message = 'The Shopify app does not have the "write_draft_orders" permission.';
    const { alertAdmin } = await import('@/lib/notifications/admin-alert.server');
    await alertAdmin({
      key: 'draft-orders-scope',
      title: 'Unsynchronized abandoned carts (missing permission)',
      cause: message,
      context: { reference: input.reference },
    });
    await recordSync({
      entity: 'draft', action: 'upsert', status: 'skipped',
      reference: input.reference, email: input.email, cause: message, silent: true,
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
      extraTags: ['abandoned-cart'],
    });
  } catch (error) {
    console.warn('syncAbandonedCheckout(customer)', (error as Error).message);
  }

  const draftInput = buildDraftInput(input);
  let lastCause = 'Unknown reason.';
  let operation: 'create' | 'update' = 'create';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const existing = await findDraftByReference(input.reference);
      operation = existing ? 'update' : 'create';

      if (existing) {
        const data = await adminRequest<{
          draftOrderUpdate: {
            draftOrder: { id: string } | null;
            userErrors: { message: string }[];
          };
        }>(DRAFT_UPDATE, { id: existing, input: draftInput });
        const errors = data?.draftOrderUpdate?.userErrors ?? [];
        if (!errors.length) {
          await recordSync({
            entity: 'draft', action: 'update', status: 'ok',
            reference: input.reference, email: input.email,
            ids: { draftId: existing }, attempts: attempt, durationMs: Date.now() - startedAt,
          });
          return { ok: true, draftId: existing };
        }
        lastCause = errors.map((e) => e.message).join(', ') || 'Rejected by Shopify.';
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
      if (draft) {
        await recordSync({
          entity: 'draft', action: 'create', status: 'ok',
          reference: input.reference, email: input.email,
          ids: { draftId: draft.id }, attempts: attempt, durationMs: Date.now() - startedAt,
        });
        return { ok: true, draftId: draft.id };
      }
      lastCause = errors.map((e) => e.message).join(', ') || 'Rejected by Shopify.';
      break;
    } catch (error) {
      lastCause = (error as Error).message?.slice(0, 300) || 'Unknown error.';
      const retryable = isRetryable(lastCause) && attempt < MAX_ATTEMPTS;
      console.warn(
        `[abandoned-cart] attempt ${attempt}/${MAX_ATTEMPTS} to ${operation} the draft ` +
          `(${input.reference}): ${lastCause}${retryable ? ' — retrying' : ''}`,
      );
      if (!retryable) break;
      await wait(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  const { alertAdmin } = await import('@/lib/notifications/admin-alert.server');
  await alertAdmin({
    key: 'draft-orders-sync-fail',
    title: `Could not ${operation} the abandoned cart draft`,
    cause: lastCause,
    context: {
      reference: input.reference,
      country: input.countryCode,
      lines: input.lines.length,
      attempts: MAX_ATTEMPTS,
    },
  });
  await recordSync({
    entity: 'draft', action: operation === 'update' ? 'update' : 'create',
    status: 'rejected', reference: input.reference, email: input.email,
    cause: lastCause, attempts: MAX_ATTEMPTS, durationMs: Date.now() - startedAt,
    silent: true, // la alerta ya se envió arriba
  });

  // Al cliente nunca se le devuelven detalles internos.
  return { ok: false, message: 'Could not synchronize the abandoned cart.' };
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
  const { recordSync } = await import('@/lib/observability/sync-audit.server');
  const startedAt = Date.now();

  if (!(await canWriteDrafts())) {
    await recordSync({
      entity: 'draft', action: 'close', status: 'skipped',
      reference, cause: 'Without write_draft_orders permission.', silent: true,
    });
    return { ok: false };
  }



  let lastCause = 'Unknown reason.';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const existing = await findDraftByReference(reference);
      if (!existing) {
        await recordSync({
          entity: 'draft', action: 'close', status: 'ok',
          reference, cause: 'No pending draft.', attempts: attempt, silent: true,
        });
        return { ok: true };
      }
      await adminRequest(DRAFT_DELETE, { input: { id: existing } });
      await recordSync({
        entity: 'draft', action: 'close', status: 'ok',
        reference, ids: { draftId: existing }, attempts: attempt,
        durationMs: Date.now() - startedAt,
      });
      return { ok: true };
    } catch (error) {
      lastCause = (error as Error).message?.slice(0, 300) || 'Unknown error.';
      const retryable = isRetryable(lastCause) && attempt < MAX_ATTEMPTS;
      console.warn(
        `[abandoned-cart] attempt ${attempt}/${MAX_ATTEMPTS} to delete the draft ` +
          `(${reference}): ${lastCause}${retryable ? ' — retrying' : ''}`,
      );
      if (!retryable) break;
      await wait(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  const { alertAdmin } = await import('@/lib/notifications/admin-alert.server');
  await alertAdmin({
    key: 'draft-orders-close-fail',
    title: 'Could not close abandoned cart draft after purchase',
    cause: lastCause,
    context: { reference, attempts: MAX_ATTEMPTS },
  });
  await recordSync({
    entity: 'draft', action: 'close', status: 'error',
    reference, cause: lastCause, attempts: MAX_ATTEMPTS,
    durationMs: Date.now() - startedAt, silent: true,
  });
  return { ok: false };
}

