/**
 * Data Provider - Capa de datos de la tienda única (Lovable).
 *
 * El catálogo se sincroniza en vivo con SUP Dropshipping (imágenes, talles,
 * precio y stock). Si SUP no responde, se usa lo importado localmente y, como
 * último recurso, el catálogo demo.
 */

import { Product, Collection, FilterOptions, SortOption } from './types';
import { dummyProducts, dummyCollections } from './dummy-data';
import { mapSupCatalog, filterInStock, SupRawProduct } from '../suppliers/sup';
import { readSupCatalog } from '../suppliers/local-catalog';
import { fetchStoreCatalog } from '../suppliers/catalog.functions';
import { SUP_MARGIN } from '../suppliers/sup-selection';
import { readPublishedIds } from '../suppliers/published-store';
import supCatalog from '../suppliers/sup-catalog.json';

const CACHE_TTL = 5 * 60 * 1000;
let catalogCache: { at: number; products: Product[] } | null = null;

/**
 * Publicación manual: si el admin eligió productos concretos, solo esos se
 * muestran en la tienda (sin importar en qué tienda externa estén listados
 * dentro de SUP). Sin selección, se muestra todo el catálogo sincronizado.
 */
function applyPublishedSelection(products: Product[]): Product[] {
  const ids = readPublishedIds();
  if (ids.length === 0) return products;
  const set = new Set(ids.flatMap((id) => [id, `sup-${id}`]));
  const filtered = products.filter((p) => set.has(p.id));
  return filtered.length > 0 ? filtered : products;
}

/**
 * Catálogo de la tienda.
 * Prioridad: SUP en vivo → productos importados en este navegador →
 * sup-catalog.json → catálogo demo.
 *
 * Regla de stock: solo se publican productos con stock en SUP y se ocultan
 * los talles/variantes agotados.
 */
async function getCatalog(): Promise<Product[]> {
  if (catalogCache && Date.now() - catalogCache.at < CACHE_TTL) return catalogCache.products;

  // 1) Shopify: catálogo publicado (los productos de SUP se importan acá).
  try {
    const shopifyProducts = filterInStock(await fetchShopifyProducts(100));
    if (shopifyProducts.length > 0) {
      catalogCache = { at: Date.now(), products: shopifyProducts };
      return shopifyProducts;
    }
  } catch {
    // seguimos con SUP en vivo
  }

  try {
    const res = await fetchStoreCatalog();
    if (res.ok && res.products.length > 0) {
      const products = applyPublishedSelection(filterInStock(mapSupCatalog(res.products as SupRawProduct[], SUP_MARGIN)));
      if (products.length > 0) {
        catalogCache = { at: Date.now(), products };
        return products;
      }
    }
  } catch {
    // seguimos con los respaldos locales
  }

  const fromBrowser = readSupCatalog();
  if (fromBrowser.length > 0) {
    const products = applyPublishedSelection(filterInStock(mapSupCatalog(fromBrowser, SUP_MARGIN)));
    if (products.length > 0) return products;
  }

  const imported = applyPublishedSelection(filterInStock(mapSupCatalog(supCatalog as SupRawProduct[], SUP_MARGIN)));
  return imported.length > 0 ? imported : dummyProducts;
}






/**
 * Get all products with optional filtering and sorting
 */
export async function getProducts(
  filters?: FilterOptions,
  sort: SortOption = 'featured'
): Promise<Product[]> {
  let products = [...(await getCatalog())];


  // Apply filters
  if (filters) {
    if (filters.collection) {
      products = products.filter(p => p.collections.includes(filters.collection!));
    }
    if (filters.minPrice !== undefined) {
      products = products.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      products = products.filter(p => p.price <= filters.maxPrice!);
    }
    if (filters.available !== undefined) {
      products = products.filter(p => p.available === filters.available);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      products = products.filter(
        p =>
          p.title.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }
  }

  // Apply sorting
  switch (sort) {
    case 'price-asc':
      products.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      products.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      products.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'name-desc':
      products.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case 'newest':
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    default:
      // 'featured' - keep original order
      break;
  }

  return products;
}

/**
 * Get a single product by slug
 */
export async function getProduct(slug: string): Promise<Product | null> {
  const catalog = await getCatalog();
  return catalog.find(p => p.slug === slug) || null;
}

/**
 * Get all collections
 */
export async function getCollections(): Promise<Collection[]> {
  // TODO: Replace with Shopify API call
  // if (SHOPIFY_ENABLED) {
  //   return shopifyClient.getCollections();
  // }

  return dummyCollections;
}

/**
 * Get a single collection by slug
 */
export async function getCollection(slug: string): Promise<Collection | null> {
  // TODO: Replace with Shopify API call
  // if (SHOPIFY_ENABLED) {
  //   return shopifyClient.getCollection(slug);
  // }

  return dummyCollections.find(c => c.slug === slug) || null;
}

/**
 * Get products for a specific collection
 */
export async function getCollectionProducts(
  collectionSlug: string,
  sort: SortOption = 'featured'
): Promise<Product[]> {
  return getProducts({ collection: collectionSlug }, sort);
}

/**
 * Search products
 */
export async function searchProducts(query: string): Promise<Product[]> {
  return getProducts({ search: query });
}

/**
 * Get featured products for homepage
 */
export async function getFeaturedProducts(limit: number = 8): Promise<Product[]> {
  const products = await getProducts();
  return products.slice(0, limit);
}

/**
 * Get new arrivals
 */
export async function getNewArrivals(limit: number = 4): Promise<Product[]> {
  const products = await getProducts({ collection: 'new-arrivals' }, 'newest');
  return products.slice(0, limit);
}

/**
 * Get related products (same collection, excluding current)
 */
export async function getRelatedProducts(
  currentProduct: Product,
  limit: number = 4
): Promise<Product[]> {
  const products = await getProducts();
  const related = products
    .filter(p => 
      p.id !== currentProduct.id &&
      p.collections.some(c => currentProduct.collections.includes(c))
    )
    .slice(0, limit);
  return related;
}
