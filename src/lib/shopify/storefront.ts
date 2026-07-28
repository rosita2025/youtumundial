/**
 * Shopify Storefront API — catálogo de Youtumundial.
 *
 * Los productos se importan desde SUP Dropshipping hacia Shopify (imágenes en
 * el CDN de Shopify, variantes limpias, precio de venta). La tienda lee ese
 * catálogo por la Storefront API, y el SKU de cada variante conserva el código
 * de SUP para poder crear el pedido al proveedor después del pago.
 */

import type { Product, ProductVariant } from '../data/types';

export const SHOPIFY_API_VERSION = '2025-07';
export const SHOPIFY_STORE_PERMANENT_DOMAIN = 'youtumundial-4ndozgzu.myshopify.com';
export const SHOPIFY_STOREFRONT_TOKEN = '7374e4b95c9a78d3cee3032240ed9731';
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

export async function storefrontApiRequest<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T | undefined> {
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
          productType
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
}
interface RawProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  createdAt: string;
  tags: string[];
  productType: string;
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
  };
}

export function mapShopifyProduct(raw: RawProduct): Product {
  const compare = num(raw.compareAtPriceRange?.minVariantPrice.amount);
  const price = num(raw.priceRange.minVariantPrice.amount);
  return {
    id: raw.id,
    slug: raw.handle,
    title: raw.title,
    description: raw.description ?? '',
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
    collections: raw.productType ? [raw.productType.toLowerCase()] : [],
    tags: raw.tags ?? [],
    available: raw.availableForSale,
    createdAt: raw.createdAt,
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
