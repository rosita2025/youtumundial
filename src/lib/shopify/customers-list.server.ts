/**
 * Listado y segmentación de clientes de Shopify (solo servidor).
 *
 * Se usa únicamente desde la vista de admin, que exige la contraseña
 * `ADMIN_PASSWORD`. Nunca se expone el token de Shopify ni el detalle de
 * los errores: el navegador solo recibe datos ya recortados.
 */
import { adminRequest, requireShopifyScope } from './admin.server';

export interface AdminCustomerRow {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  country: string | null;
  tags: string[];
  subscribed: boolean;
  ordersCount: number;
  createdAt: string;
}

export interface AdminCustomerPage {
  ok: boolean;
  customers: AdminCustomerRow[];
  hasNextPage: boolean;
  endCursor: string | null;
  message?: string;
}

const CUSTOMERS_QUERY = `
  query AdminCustomers($first: Int!, $after: String, $query: String) {
    customers(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          email
          firstName
          lastName
          phone
          tags
          numberOfOrders
          createdAt
          emailMarketingConsent { marketingState }
          defaultAddress { countryCodeV2 }
        }
      }
    }
  }
`;

/** Etiquetas que la tienda usa para segmentar. */
export const SEGMENT_TAGS = [
  'newsletter-youtumundial',
  'newsletter',
  'youtumundial-checkout',
  'carrito-abandonado',
] as const;

/** Solo se aceptan etiquetas con caracteres seguros, nunca texto libre crudo. */
const sanitizeTag = (tag: string) =>
  String(tag ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);

export function buildCustomerQuery(options: {
  tags?: string[];
  search?: string;
  onlySubscribed?: boolean;
}): string {
  const parts: string[] = [];

  const tags = (options.tags ?? []).map(sanitizeTag).filter(Boolean);
  if (tags.length) {
    parts.push(`(${tags.map((t) => `tag:'${t}'`).join(' OR ')})`);
  }

  const search = String(options.search ?? '')
    .trim()
    .replace(/["'\\()]/g, '')
    .slice(0, 80);
  if (search) parts.push(`(email:*${search}* OR first_name:*${search}* OR last_name:*${search}*)`);

  if (options.onlySubscribed) parts.push('email_marketing_state:subscribed');

  return parts.join(' AND ');
}

export async function listShopifyCustomers(options: {
  tags?: string[];
  search?: string;
  onlySubscribed?: boolean;
  limit?: number;
  cursor?: string | null;
}): Promise<AdminCustomerPage> {
  const gate = await requireShopifyScope('read_customers');
  if (!gate.ok) {
    return { ok: false, customers: [], hasNextPage: false, endCursor: null, message: gate.message };
  }

  const first = Math.min(Math.max(Number(options.limit ?? 50), 1), 100);
  const query = buildCustomerQuery(options);

  try {
    const data = await adminRequest<{
      customers: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{
          node: {
            id: string;
            email: string | null;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
            tags: string[];
            numberOfOrders: string | number | null;
            createdAt: string;
            emailMarketingConsent: { marketingState: string | null } | null;
            defaultAddress: { countryCodeV2: string | null } | null;
          };
        }>;
      };
    }>(CUSTOMERS_QUERY, {
      first,
      after: options.cursor || null,
      query: query || null,
    });

    const customers: AdminCustomerRow[] = (data?.customers?.edges ?? []).map(({ node }) => ({
      id: node.id,
      email: node.email,
      name: [node.firstName, node.lastName].filter(Boolean).join(' ').trim() || 'Sin nombre',
      phone: node.phone,
      country: node.defaultAddress?.countryCodeV2 ?? null,
      tags: Array.isArray(node.tags) ? node.tags.slice(0, 20) : [],
      subscribed:
        String(node.emailMarketingConsent?.marketingState ?? '').toUpperCase() === 'SUBSCRIBED',
      ordersCount: Number(node.numberOfOrders ?? 0) || 0,
      createdAt: node.createdAt,
    }));

    return {
      ok: true,
      customers,
      hasNextPage: Boolean(data?.customers?.pageInfo?.hasNextPage),
      endCursor: data?.customers?.pageInfo?.endCursor ?? null,
    };
  } catch (error) {
    console.error('listShopifyCustomers', error);
    return {
      ok: false,
      customers: [],
      hasNextPage: false,
      endCursor: null,
      message: 'No se pudo consultar la lista de clientes.',
    };
  }
}
