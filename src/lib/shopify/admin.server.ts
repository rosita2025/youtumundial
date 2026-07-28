/**
 * Shopify Admin API (solo servidor).
 *
 * Se usa para leer los pedidos reales de Shopify: nombre, correo, dirección,
 * país y los productos con su SKU (el SKU es el mismo código que usa SUP para
 * el fulfillment). El token vive en el secreto SHOPIFY_ACCESS_TOKEN y NUNCA
 * puede salir al navegador: todo lo que devuelve este módulo pasa antes por
 * una función de servidor protegida con la contraseña del panel.
 */

const API_VERSION = '2025-07';

export const SHOPIFY_SHOP_DOMAIN = 'youtumundial-4ndozgzu.myshopify.com';

function adminEndpoint() {
  return `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
}

async function adminRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!token) throw new Error('Falta el token de Shopify (SHOPIFY_ACCESS_TOKEN).');

  const res = await fetch(adminEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Shopify Admin HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`Shopify: ${json.errors.map((e) => e.message).join(', ')}`);
  if (!json.data) throw new Error('Shopify no devolvió datos.');
  return json.data;
}

const ORDERS_QUERY = `
  query Orders($first: Int!) {
    orders(first: $first, reverse: true, sortKey: CREATED_AT) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          email
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { firstName lastName }
          shippingAddress {
            name
            address1
            address2
            city
            province
            zip
            country
            countryCodeV2
            phone
          }
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                sku
                variantTitle
              }
            }
          }
        }
      }
    }
  }
`;

export interface ShopifyOrderLine {
  title: string;
  variantTitle: string;
  sku: string;
  quantity: number;
}

export interface ShopifyOrder {
  id: string;
  number: string;
  createdAt: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  countryCode: string;
  total: number;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  lines: ShopifyOrderLine[];
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Pedidos de Shopify normalizados para el panel privado. */
export async function listShopifyAdminOrders(limit = 25): Promise<ShopifyOrder[]> {
  const first = Math.min(Math.max(limit, 1), 100);
  const data = await adminRequest<{
    orders: { edges: Array<{ node: Record<string, any> }> };
  }>(ORDERS_QUERY, { first });

  return (data.orders?.edges ?? []).map(({ node }) => {
    const ship = node.shippingAddress ?? {};
    const customerName =
      [str(node.customer?.firstName), str(node.customer?.lastName)].filter(Boolean).join(' ') ||
      str(ship.name) ||
      'Cliente';

    return {
      id: str(node.id),
      number: str(node.name),
      createdAt: str(node.createdAt),
      customer: customerName,
      email: str(node.email),
      phone: str(ship.phone),
      address: [ship.address1, ship.address2, ship.city, ship.province, ship.zip]
        .map(str)
        .filter(Boolean)
        .join(', '),
      country: str(ship.country),
      countryCode: str(ship.countryCodeV2),
      total: Number(node.totalPriceSet?.shopMoney?.amount ?? 0) || 0,
      currency: str(node.totalPriceSet?.shopMoney?.currencyCode) || 'USD',
      financialStatus: str(node.displayFinancialStatus),
      fulfillmentStatus: str(node.displayFulfillmentStatus),
      lines: (node.lineItems?.edges ?? []).map(({ node: li }: { node: Record<string, any> }) => ({
        title: str(li.title),
        variantTitle: str(li.variantTitle),
        sku: str(li.sku),
        quantity: Number(li.quantity) || 1,
      })),
    } satisfies ShopifyOrder;
  });
}
