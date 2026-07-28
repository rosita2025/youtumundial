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
import { fetchShopifyProducts } from '../shopify/storefront';

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
 * Busca un producto por el SKU de cualquiera de sus variantes.
 * El SKU de Shopify es el mismo código que usa SUP, así que /productos/:sku
 * permite abrir la ficha desde un pedido o desde el proveedor.
 */
export async function getProductBySku(sku: string): Promise<{ product: Product; variantId: string } | null> {
  const needle = String(sku ?? '').trim().toLowerCase();
  if (!needle) return null;
  const catalog = await getCatalog();
  for (const product of catalog) {
    const variant = product.variants.find(v => (v.sku ?? '').trim().toLowerCase() === needle);
    if (variant) return { product, variantId: variant.id };
  }
  // Fallback: algunos productos guardan el código en el slug o el id.
  const bySlug = catalog.find(p => p.slug.toLowerCase() === needle || p.id.toLowerCase().endsWith(needle));
  return bySlug ? { product: bySlug, variantId: bySlug.variants[0]?.id ?? '' } : null;
}

/** Título legible a partir de un slug de categoría. */
const titleize = (slug: string) =>
  slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Colecciones REALES: se arman con las categorías de los productos que están
 * importados en tu catálogo. Si un producto no trae categoría, no inventamos
 * colecciones de demo.
 */
export async function getCollections(): Promise<Collection[]> {
  const catalog = await getCatalog();
  const map = new Map<string, Product[]>();
  for (const product of catalog) {
    for (const slug of product.collections) {
      const key = String(slug).trim().toLowerCase();
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), product]);
    }
  }

  return [...map.entries()].map(([slug, products]) => ({
    id: `col-${slug}`,
    slug,
    title: titleize(slug),
    description: '',
    image: products[0]?.images[0] ?? {
      id: `col-${slug}-img`,
      url: '',
      altText: titleize(slug),
      width: 800,
      height: 1000,
    },
    productCount: products.length,
  }));
}

/**
 * Get a single collection by slug
 */
export async function getCollection(slug: string): Promise<Collection | null> {
  const collections = await getCollections();
  return collections.find(c => c.slug === slug) || null;
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
 * Novedades: lo último importado. Si no hay una colección "new-arrivals",
 * mostramos los productos más nuevos del catálogo real.
 */
export async function getNewArrivals(limit: number = 4): Promise<Product[]> {
  const tagged = await getProducts({ collection: 'new-arrivals' }, 'newest');
  const products = tagged.length > 0 ? tagged : await getProducts(undefined, 'newest');
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
