/**
 * Respaldo de pedidos con las credenciales de la API de SUP (solo servidor).
 *
 * Cuando la app de Shopify no tiene el permiso `read_orders`, igual podemos
 * mostrar los pedidos reales usando el usuario y contraseña de la API de SUP
 * (SUP_USERNAME / SUP_PASSWORD). Devuelve la misma forma que los pedidos de
 * Shopify para que el panel no tenga que distinguir la fuente.
 */
import type { ShopifyOrder } from './admin.server';

const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function listSupOrdersForPanel(limit: number): Promise<ShopifyOrder[]> {
  const { listSupOrders } = await import('@/lib/suppliers/sup-api.server');
  const rows = (await listSupOrders({ limit })) as Record<string, unknown>[];

  return rows.map((row): ShopifyOrder => {
    const consignee = (row.consignee ?? row.address ?? {}) as Record<string, unknown>;
    const products = Array.isArray(row.products) ? (row.products as Record<string, unknown>[]) : [];
    const created = str(row.created_at ?? row.create_time ?? row.created);

    return {
      id: `sup_${str(row.order_id ?? row.id ?? row.order_sn)}`,
      number: str(row.order_sn ?? row.order_no ?? row.order_id ?? row.id),
      createdAt: created ? new Date(created.replace(' ', 'T') + 'Z').toISOString() : '',
      customer: str(consignee.name) || 'Cliente',
      email: str(consignee.email),
      phone: str(consignee.phone),
      country: str(consignee.country),
      countryCode: str(consignee.country_code ?? consignee.countryCode),
      address: [consignee.address, consignee.city, consignee.province, consignee.zip_code]
        .map(str)
        .filter(Boolean)
        .join(', '),
      total: num(row.amount ?? row.total_price ?? row.goods_amount),
      currency: 'USD',
      financialStatus: str(row.statusInfo ?? row.status_text),
      fulfillmentStatus: str(row.tracking_number) ? 'Enviado' : '',
      lines: products.length
        ? products.map((p) => ({
            title: str(p.title ?? p.product_name ?? p.name ?? row.order_title) || 'Producto',
            variantTitle: str(p.variant ?? p.variant_name),
            quantity: Number(p.quantity) || 1,
            sku: str(p.sku ?? p.product_id ?? p.id),
          }))
        : [
            {
              title: str(row.order_title) || 'Producto',
              variantTitle: '',
              quantity: Number(row.goods_num) || 1,
              sku: str(row.order_sn),
            },
          ],
    };
  });
}
