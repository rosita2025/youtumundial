/**
 * Catálogo de la tienda expuesto al navegador.
 *
 * Primero se intenta la Storefront API (pública). Si no devuelve productos
 * —caso típico cuando los productos recién importados todavía no están
 * publicados en el canal de venta— se lee el catálogo con el Admin API en el
 * servidor y se devuelven solo datos públicos de catálogo.
 */
import { createServerFn } from '@tanstack/react-start';
import type { Product } from '../data/types';

export interface ShopifyCatalogResult {
  ok: boolean;
  source: 'admin' | 'none';
  products: Product[];
}

export const fetchShopifyCatalogAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ShopifyCatalogResult> => {
    const { fetchShopifyProductsAdmin } = await import('./catalog-admin.server');
    const products = await fetchShopifyProductsAdmin(100);
    return {
      ok: products.length > 0,
      source: products.length > 0 ? 'admin' : 'none',
      products,
    };
  },
);
