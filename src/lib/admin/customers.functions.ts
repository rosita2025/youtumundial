/**
 * Consulta de clientes de Shopify para la vista de admin.
 *
 * Seguridad:
 * - Cada llamada exige la contraseña de administración (`ADMIN_PASSWORD`).
 * - Las etiquetas y el texto de búsqueda se saneen en el servidor.
 * - Ante credenciales incorrectas se devuelve un error genérico.
 */
import { createServerFn } from '@tanstack/react-start';
import type { AdminCustomerPage } from '@/lib/shopify/customers-list.server';

export interface AdminCustomersInput {
  password: string;
  tags?: string[];
  search?: string;
  onlySubscribed?: boolean;
  cursor?: string | null;
}

export const listAdminCustomers = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown): AdminCustomersInput => {
    const raw = (data ?? {}) as Partial<AdminCustomersInput>;
    return {
      password: String(raw.password ?? '').slice(0, 200),
      tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10).map((t) => String(t)) : [],
      search: String(raw.search ?? '').slice(0, 80),
      onlySubscribed: Boolean(raw.onlySubscribed),
      cursor: raw.cursor ? String(raw.cursor).slice(0, 500) : null,
    };
  })
  .handler(async ({ data }): Promise<AdminCustomerPage> => {
    const { isAdminPassword } = await import('@/lib/admin/auth.server');
    if (!(await isAdminPassword(data.password))) {
      return {
        ok: false,
        customers: [],
        hasNextPage: false,
        endCursor: null,
        message: 'Acceso no autorizado.',
      };
    }

    const { listShopifyCustomers } = await import('@/lib/shopify/customers-list.server');
    return listShopifyCustomers({
      tags: data.tags,
      search: data.search,
      onlySubscribed: data.onlySubscribed,
      cursor: data.cursor,
      limit: 50,
    });
  });
