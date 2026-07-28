import { createServerFn } from '@tanstack/react-start';
import type { ShopifyOrder } from './admin.server';

const readToken = (value: unknown) => String(value ?? '').slice(0, 200);

/**
 * Pedidos de Shopify para el panel privado.
 * Trae datos personales del cliente, así que exige la contraseña del panel:
 * la validación es del lado del servidor, no del navegador.
 */
export const listShopifyOrders = createServerFn({ method: 'POST' })
  .inputValidator((input: { limit?: number; adminToken?: string }) => ({
    limit: Math.min(Math.max(Number(input?.limit) || 25, 1), 100),
    adminToken: readToken(input?.adminToken),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; orders: ShopifyOrder[]; error?: string; source?: 'shopify' | 'sup' }> => {
    const { assertAdmin } = await import('@/lib/admin/guard.server');
    assertAdmin(data.adminToken);

    try {
      const { listShopifyAdminOrders } = await import('./admin.server');
      return { ok: true, orders: await listShopifyAdminOrders(data.limit), source: 'shopify' };
    } catch (error) {
      const { ShopifyScopeError } = await import('./admin.server');
      if (error instanceof ShopifyScopeError) {
        // Shopify no da permiso de pedidos: usamos las credenciales de la API
        // de SUP (usuario y contraseña), que sí permiten leer pedidos.
        try {
          const { listSupOrdersForPanel } = await import('./orders-fallback.server');
          return { ok: true, orders: await listSupOrdersForPanel(data.limit), source: 'sup' };
        } catch (supError) {
          console.error('SUP orders fallback failed:', supError);
          return {
            ok: false,
            orders: [],
            error:
              'Shopify no permite leer pedidos con los permisos actuales y tampoco respondió la API de SUP. Activá el permiso "read_orders" en Shopify o revisá el usuario y contraseña de SUP.',
          };
        }
      }
      // Nunca devolvemos el detalle interno del proveedor al navegador.
      console.error('Shopify orders sync failed:', error);
      return { ok: false, orders: [], error: 'No se pudieron leer los pedidos de Shopify.' };
    }
  });
