/**
 * Data Provider - Abstract data layer
 * 
 * This file provides functions to fetch products and collections.
 * Currently uses dummy data, but is structured for easy Shopify integration.
 * 
 * TODO: To switch to Shopify:
 * 1. Add VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN to .env
 * 2. Import Shopify client from './shopify/client'
 * 3. Replace dummy data returns with Shopify API calls
 */

import { Product, Collection, FilterOptions, SortOption } from './types';
import { dummyProducts, dummyCollections } from './dummy-data';

// Check if Shopify credentials are available
const SHOPIFY_ENABLED = Boolean(
  import.meta.env.VITE_SHOPIFY_STORE_DOMAIN &&
  import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN
);

/**
 * Get all products with optional filtering and sorting
 */
export async function getProducts(
  filters?: FilterOptions,
  sort: SortOption = 'featured'
): Promise<Product[]> {
  // TODO: Replace with Shopify API call when credentials are available
  // if (SHOPIFY_ENABLED) {
  //   return shopifyClient.getProducts(filters, sort);
  // }

  let products = [...dummyProducts];

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
  // TODO: Replace with Shopify API call
  // if (SHOPIFY_ENABLED) {
  //   return shopifyClient.getProduct(slug);
  // }

  return dummyProducts.find(p => p.slug === slug) || null;
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
