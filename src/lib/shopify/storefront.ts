/**
 * Shopify Storefront API — catálogo de Youtumundial.
 *
 * Los productos se importan desde SUP Dropshipping hacia Shopify (imágenes en
 * el CDN de Shopify, variantes limpias, precio de venta). La tienda lee ese
 * catálogo por la Storefront API, y el SKU de cada variante conserva el código
 * de SUP para poder crear el pedido al proveedor después del pago.
 */

import type { Product, ProductVariant } from '../data/types';
import { cleanDescription } from '../data/description';
import { assertAllowedShopifyUrl } from '../security/connection-audit';

export const SHOPIFY_API_VERSION = '2025-07';
export const SHOPIFY_STORE_PERMANENT_DOMAIN = 'youtumundial-4ndozgzu.myshopify.com';
export const SHOPIFY_STOREFRONT_TOKEN = '7374e4b95c9a78d3cee3032240ed9731';
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

export async function storefrontApiRequest<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T | undefined> {
  // Auditoría: nunca hablamos con otra tienda que no sea la propia.
  assertAllowedShopifyUrl(SHOPIFY_STOREFRONT_URL);

  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    console.error('Shopify: se requiere un plan activo para usar la API.');
    return undefined;
  }
  if (!response.ok) throw new Error(`Shopify HTTP ${response.status}`);

  const data = await response.json();
  if (data.errors) {
    throw new Error(`Shopify: ${data.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }
  return data as T;
}

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          description
          handle
          createdAt
          tags
          vendor
          productType
          collections(first: 10) { edges { node { handle title } } }
          availableForSale
          priceRange { minVariantPrice { amount currencyCode } }
          compareAtPriceRange { minVariantPrice { amount } }
          images(first: 10) { edges { node { url altText width height } } }
          options { name values }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                availableForSale
                price { amount currencyCode }
                compareAtPrice { amount }
                selectedOptions { name value }
                image { url altText width height }
              }
            }
          }
        }
      }
    }
  }
`;

type Edge<T> = { node: T };
interface RawVariant {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  price: { amount: string };
  compareAtPrice: { amount: string } | null;
  selectedOptions: Array<{ name: string; value: string }>;
  image?: { url: string; altText: string | null; width: number | null; height: number | null } | null;
}
interface RawProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  createdAt: string;
  tags: string[];
  productType: string;
  vendor: string;
  collections?: { edges: Edge<{ handle: string; title: string }>[] };
  availableForSale: boolean;
  priceRange: { minVariantPrice: { amount: string } };
  compareAtPriceRange: { minVariantPrice: { amount: string } } | null;
  images: { edges: Edge<{ url: string; altText: string | null; width: number | null; height: number | null }>[] };
  options: Array<{ name: string; values: string[] }>;
  variants: { edges: Edge<RawVariant>[] };
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

/** Handles de colecciones reales de Shopify + el tipo de producto como respaldo. */
export function buildCollections(handles: string[], productType?: string | null): string[] {
  const list = handles.map((h) => String(h ?? '').trim().toLowerCase()).filter(Boolean);
  const type = String(productType ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  if (type && !list.includes(type)) list.push(type);
  return [...new Set(list)];
}

function mapVariant(raw: RawVariant): ProductVariant {
  const compare = num(raw.compareAtPrice?.amount);
  return {
    id: raw.id,
    title: raw.title,
    price: num(raw.price.amount),
    compareAtPrice: compare > 0 ? compare : undefined,
    available: raw.availableForSale,
    sku: raw.sku ?? '',
    options: raw.selectedOptions.map((o) => ({ name: o.name, value: o.value })),
    image: raw.image ? {
      id: raw.id + '-img',
      url: raw.image.url,
      altText: raw.image.altText || raw.title,
      width: raw.image.width || 800,
      height: raw.image.height || 1000,
    } : undefined,
  };
}

export function mapShopifyProduct(raw: RawProduct): Product {
  const compare = num(raw.compareAtPriceRange?.minVariantPrice.amount);
  const price = num(raw.priceRange.minVariantPrice.amount);
  return {
    id: raw.id,
    slug: raw.handle,
    title: raw.title,
    description: cleanDescription(raw.description, raw.handle),
    price,
    compareAtPrice: compare > price ? compare : undefined,
    images: raw.images.edges.map((e, i) => ({
      id: `${raw.id}-img-${i}`,
      url: e.node.url,
      altText: e.node.altText ?? `${raw.title} - Imagen ${i + 1}`,
      width: e.node.width ?? 800,
      height: e.node.height ?? 1000,
    })),
    variants: raw.variants.edges.map((e) => mapVariant(e.node)),
    collections: buildCollections(
      (raw.collections?.edges ?? []).map((e) => e.node.handle),
      raw.productType,
    ),
    collectionTitles: Object.fromEntries(
      (raw.collections?.edges ?? []).map((e) => [e.node.handle.toLowerCase(), e.node.title]),
    ),
    productType: raw.productType || undefined,
    vendor: raw.vendor || undefined,
    tags: raw.tags ?? [],
    available: raw.availableForSale,
    createdAt: raw.createdAt,
    origin: {
      supplier: 'shopify',
      shopId: SHOPIFY_STORE_PERMANENT_DOMAIN,
      sourceId: raw.id,
      importedAt: new Date().toISOString(),
    },
  };
}

/** Catálogo de la tienda leído desde Shopify. Devuelve [] si no hay productos. */
export async function fetchShopifyProducts(first = 100, query?: string): Promise<Product[]> {
  const data = await storefrontApiRequest<{ data: { products: { edges: Edge<RawProduct>[] } } }>(
    PRODUCTS_QUERY,
    { first, query },
  );
  const edges = data?.data?.products?.edges ?? [];
  return edges.map((e) => mapShopifyProduct(e.node));
}
