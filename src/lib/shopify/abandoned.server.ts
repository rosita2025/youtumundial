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

  const shippingAddress = input.address
    ? {
        firstName,
        lastName,
        address1: input.address.slice(0, 250),
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

/**
 * Crea o actualiza el carrito abandonado en Shopify.
 * Es idempotente: una sola referencia = un solo borrador (no duplica).
 */
export async function syncAbandonedCheckout(
  input: AbandonedCheckoutInput,
): Promise<AbandonedResult> {
  if (!input.email || input.lines.length === 0) {
    return { ok: false, message: 'Datos insuficientes.' };
  }
  if (!(await canWriteDrafts())) {
    return { ok: false, message: 'La app de Shopify no tiene el permiso "write_draft_orders".' };
  }

  const draftInput = buildDraftInput(input);

  try {
    const existing = await findDraftByReference(input.reference);
    if (existing) {
      const data = await adminRequest<{
        draftOrderUpdate: {
          draftOrder: { id: string } | null;
          userErrors: { message: string }[];
        };
      }>(DRAFT_UPDATE, { id: existing, input: draftInput });
      const errors = data?.draftOrderUpdate?.userErrors ?? [];
      if (errors.length) return { ok: false, message: errors.map((e) => e.message).join(', ') };
      return { ok: true, draftId: existing };
    }

    const data = await adminRequest<{
      draftOrderCreate: {
        draftOrder: { id: string } | null;
        userErrors: { message: string }[];
      };
    }>(DRAFT_CREATE, { input: draftInput });
    const errors = data?.draftOrderCreate?.userErrors ?? [];
    const draft = data?.draftOrderCreate?.draftOrder;
    if (!draft) return { ok: false, message: errors.map((e) => e.message).join(', ') || 'Rechazado' };
    return { ok: true, draftId: draft.id };
  } catch (error) {
    console.warn('syncAbandonedCheckout', input.reference, (error as Error).message);
    return { ok: false, message: 'No se pudo sincronizar el carrito abandonado.' };
  }
}

/**
 * El cliente terminó de comprar: el carrito ya no está abandonado.
 * Borra el borrador para que no quede duplicado con el pedido real.
 */
export async function closeAbandonedCheckout(reference: string): Promise<AbandonedResult> {
  if (!reference) return { ok: false };
  if (!(await canWriteDrafts())) return { ok: false };

  try {
    const existing = await findDraftByReference(reference);
    if (!existing) return { ok: true };
    await adminRequest(DRAFT_DELETE, { input: { id: existing } });
    return { ok: true };
  } catch (error) {
    console.warn('closeAbandonedCheckout', reference, (error as Error).message);
    return { ok: false };
  }
}
