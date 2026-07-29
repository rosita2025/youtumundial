/**
 * Catálogo desde el Admin API de Shopify (solo servidor).
 *
 * La Storefront API solo devuelve productos publicados en el canal de venta.
 * Cuando se importan productos nuevos desde SUP y todavía no están publicados
 * (o el canal headless no los incluye), la tienda quedaba vacía o con un solo
 * producto. Acá leemos el catálogo real con el Admin API (`read_products`) y
 * lo mapeamos al mismo tipo `Product` que usa el resto de la tienda.
 *
 * Solo se exponen datos de catálogo (título, imágenes, precios, variantes):
 * nada de costos, proveedores ni credenciales. El token nunca sale del servidor.
 */

import type { Product, ProductVariant } from '../data/types';
import { cleanDescription } from '../data/description';
import { adminRequest, hasShopifyAdminCredentials } from './admin.server';
import { SHOPIFY_STORE_PERMANENT_DOMAIN } from './storefront';

const ADMIN_PRODUCTS_QUERY = `
  query AdminProducts($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          descriptionHtml
          handle
          createdAt
          tags
          productType
          status
          totalInventory
          media(first: 10) {
            edges {
              node {
                ... on MediaImage {
                  image { url altText width height }
                }
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price
                compareAtPrice
                inventoryQuantity
                inventoryPolicy
                selectedOptions { name value }
              }
            }
          }
        }
      }
    }
  }
`;

interface AdminVariant {
  id: string;
  title: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity: number | null;
  inventoryPolicy: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
}

interface AdminProduct {
  id: string;
  title: string;
  descriptionHtml: string | null;
  handle: string;
  createdAt: string;
  tags: string[];
  productType: string | null;
  status: string;
  totalInventory: number | null;
  media: {
    edges: Array<{
      node: { image?: { url: string; altText: string | null; width: number | null; height: number | null } | null };
    }>;
  };
  variants: { edges: Array<{ node: AdminVariant }> };
}

const num = (value: unknown): number => {
  const n = parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
};

const stripHtml = (html: string | null): string =>
  cleanDescription(String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());

function mapVariant(raw: AdminVariant): ProductVariant {
  const compare = num(raw.compareAtPrice);
  const price = num(raw.price);
  const tracked = raw.inventoryQuantity !== null && raw.inventoryQuantity !== undefined;
  const continues = (raw.inventoryPolicy ?? '').toUpperCase() === 'CONTINUE';
  return {
    id: raw.id,
    title: raw.title,
    price,
    compareAtPrice: compare > price ? compare : undefined,
    available: continues || !tracked || (raw.inventoryQuantity ?? 0) > 0,
    sku: raw.sku ?? '',
    options: raw.selectedOptions.map((o) => ({ name: o.name, value: o.value })),
  };
}

function mapProduct(raw: AdminProduct): Product {
  const variants = raw.variants.edges.map((e) => mapVariant(e.node));
  const prices = variants.map((v) => v.price).filter((p) => p > 0);
  const price = prices.length ? Math.min(...prices) : 0;
  const compare = Math.max(0, ...variants.map((v) => v.compareAtPrice ?? 0));
  const images = raw.media.edges
    .map((e) => e.node.image)
    .filter((img): img is NonNullable<typeof img> => Boolean(img?.url))
    .map((img, i) => ({
      id: `${raw.id}-img-${i}`,
      url: img.url,
      altText: img.altText ?? `${raw.title} - Imagen ${i + 1}`,
      width: img.width ?? 800,
      height: img.height ?? 1000,
    }));

  return {
    id: raw.id,
    slug: raw.handle,
    title: raw.title,
    description: stripHtml(raw.descriptionHtml),
    price,
    compareAtPrice: compare > price ? compare : undefined,
    images,
    variants,
    collections: raw.productType ? [raw.productType.toLowerCase()] : [],
    tags: raw.tags ?? [],
    available: variants.some((v) => v.available),
    createdAt: raw.createdAt,
    origin: {
      supplier: 'shopify',
      shopId: SHOPIFY_STORE_PERMANENT_DOMAIN,
      sourceId: raw.id,
      importedAt: new Date().toISOString(),
    },
  };
}

/**
 * Catálogo completo (productos activos) leído con el Admin API.
 * Devuelve [] si no hay credenciales o si Shopify rechaza la consulta.
 */
export async function fetchShopifyProductsAdmin(first = 100): Promise<Product[]> {
  if (!hasShopifyAdminCredentials()) return [];
  try {
    const data = await adminRequest<{ products: { edges: Array<{ node: AdminProduct }> } }>(
      ADMIN_PRODUCTS_QUERY,
      { first: Math.min(100, Math.max(1, Math.round(first) || 100)) },
    );
    return (data?.products?.edges ?? [])
      .map((e) => e.node)
      .filter((p) => (p.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE')
      .map(mapProduct);
  } catch (error) {
    // Sin detalles al cliente: el motivo queda en los logs del servidor.
    console.error('Catálogo Admin de Shopify falló:', (error as Error).message);
    return [];
  }
}
