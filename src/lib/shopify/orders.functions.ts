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
  .handler(async ({ data }): Promise<{ ok: boolean; orders: ShopifyOrder[]; error?: string }> => {
    const { assertAdmin } = await import('@/lib/admin/guard.server');
    assertAdmin(data.adminToken);

    try {
      const { listShopifyAdminOrders } = await import('./admin.server');
      return { ok: true, orders: await listShopifyAdminOrders(data.limit) };
    } catch (error) {
      const { ShopifyScopeError } = await import('./admin.server');
      if (error instanceof ShopifyScopeError) {
        return {
          ok: false,
          orders: [],
          error:
            'Shopify no permite leer pedidos con los permisos actuales. Activá el permiso "read_orders" (Configuración → Apps y canales de venta → Desarrollar apps → Ámbitos de la Admin API) y volvé a sincronizar.',
        };
      }
      // Nunca devolvemos el detalle interno del proveedor al navegador.
      console.error('Shopify orders sync failed:', error);
      return { ok: false, orders: [], error: 'No se pudieron leer los pedidos de Shopify.' };
    }
  });
