/**
 * Data Provider - Capa de datos de la tienda única (Lovable).
 *
 * El catálogo se sincroniza en vivo con SUP Dropshipping (imágenes, talles,
 * precio y stock). Si SUP no responde, se usa lo importado localmente y, como
 * último recurso, el catálogo demo.
 */

import { Product, Collection, FilterOptions, SortOption } from './types';
import { mapSupCatalog, filterInStock, SupRawProduct } from '../suppliers/sup';
import { readSupCatalog } from '../suppliers/local-catalog';
import { fetchStoreCatalog } from '../suppliers/catalog.functions';
import { SUP_MARGIN } from '../suppliers/sup-selection';
import { readPublishedIds } from '../suppliers/published-store';
import supCatalog from '../suppliers/sup-catalog.json';
import { fetchShopifyProducts } from '../shopify/storefront';

// Cache corta: los cambios de título/descripción hechos en Shopify se ven casi
// al instante en la tienda.
const CACHE_TTL = 5 * 60 * 1000;
let catalogCache: { at: number; products: Product[] } | null = null;

/** Fuerza releer el catálogo de Shopify en la próxima consulta. */
export function invalidateCatalogCache(): void {
  catalogCache = null;
  // Si estamos en el navegador, intentamos avisar al worker o simplemente limpiar localmente
  if (typeof window !== 'undefined') {
    console.log('Catalog cache invalidated');
  }
}



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
export async function getCatalog(): Promise<Product[]> {
  if (catalogCache && Date.now() - catalogCache.at < CACHE_TTL) {
    return catalogCache.products;
  }

  // 1) Shopify: catálogo publicado (los productos de SUP se importan acá).
  try {
    const shopifyProducts = filterInStock(await fetchShopifyProducts(100));
    if (shopifyProducts.length > 0) {
      catalogCache = { at: Date.now(), products: shopifyProducts };
      return shopifyProducts;
    }
  } catch {
    // seguimos con el catálogo del Admin API
  }

  // 2) Shopify Admin: productos activos que todavía no están publicados en el
  // canal de venta (la Storefront API no los devuelve). Así los productos
  // recién importados aparecen igual en la tienda.
  try {
    const { fetchShopifyCatalogAdmin } = await import('../shopify/catalog.functions');
    const res = await fetchShopifyCatalogAdmin();
    const products = filterInStock(res.products as Product[]);
    if (products.length > 0) {
      catalogCache = { at: Date.now(), products };
      return products;
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

  // Sin catálogo real no mostramos productos de demo: mejor lista vacía.
  return applyPublishedSelection(filterInStock(mapSupCatalog(supCatalog as SupRawProduct[], SUP_MARGIN)));

}






/**
 * Get all products with optional filtering and sorting
 */
export async function getProducts(
  filters?: FilterOptions,
  sort: SortOption = 'featured'
): Promise<Product[]> {
  return selectProducts(await getCatalog(), filters, sort);
}

/**
 * Versión sincrónica: filtra y ordena un catálogo ya cargado (por ejemplo el
 * que llega desde el loader de la ruta, renderizado en el servidor).
 */
export function selectProducts(
  catalog: Product[],
  filters?: FilterOptions,
  sort: SortOption = 'featured'
): Product[] {
  let products = [...catalog];



  // Apply filters
  if (filters) {
    if (filters.collection) {
      products = products.filter(p => p.collections.includes(filters.collection!));
    }
    if (filters.vendor) {
      const vendorLower = filters.vendor.toLowerCase();
      products = products.filter(p => (p.vendor || '').toLowerCase() === vendorLower);
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
      // Mapeo de términos de búsqueda del usuario para corregir typos comunes en productos específicos
      const normalizedSearch = searchLower
        .replace(/shpulder/g, 'shoulder')
        .replace(/slveedeless/g, 'sleeveless')
        .replace(/slevvedt/g, 'sleeved')
        .replace(/twitter/g, 'twisted');

      products = products.filter(
        p =>
          p.title.toLowerCase().includes(normalizedSearch) ||
          p.description.toLowerCase().includes(normalizedSearch) ||
          (p.vendor || '').toLowerCase().includes(normalizedSearch) ||
          p.tags.some(t => t.toLowerCase().includes(normalizedSearch)) ||
          // También buscamos por el término original por si acaso
          p.title.toLowerCase().includes(searchLower)
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
  return selectCollections(await getCatalog());
}

/** Versión sincrónica sobre un catálogo ya cargado. */
export function selectCollections(catalog: Product[]): Collection[] {
  const map = new Map<string, Product[]>();
  const titles = new Map<string, string>();
  for (const product of catalog) {
    for (const slug of product.collections) {
      const key = String(slug).trim().toLowerCase();
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), product]);
      const real = product.collectionTitles?.[key];
      if (real && !titles.has(key)) titles.set(key, real);
    }
  }

  return [...map.entries()].map(([slug, products]) => ({
    id: `col-${slug}`,
    slug,
    title: titles.get(slug) ?? titleize(slug),
    description: '',
    image: products[0]?.images[0] ?? {
      id: `col-${slug}-img`,
      url: '',
      altText: titles.get(slug) ?? titleize(slug),
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
 * Get all distinct vendors (brands) present in the catalog
 */
export async function getVendors(): Promise<string[]> {
  return selectVendors(await getCatalog());
}

/** Versión sincrónica sobre un catálogo ya cargado. */
export function selectVendors(catalog: Product[]): string[] {
  const set = new Set<string>();
  for (const p of catalog) {
    const v = (p.vendor || '').trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
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

/** Relacionados a partir de un catálogo ya cargado. */
export function selectRelatedProducts(
  catalog: Product[],
  currentProduct: Product,
  limit: number = 4
): Product[] {
  return catalog
    .filter(
      p =>
        p.id !== currentProduct.id &&
        p.collections.some(c => currentProduct.collections.includes(c))
    )
    .slice(0, limit);
}
