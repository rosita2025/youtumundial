import { useCallback, useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { RefreshCw, ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAdminToken } from '@/components/admin/AdminGate';
import { listShopifyOrders } from '@/lib/shopify/orders.functions';
import type { ShopifyOrder } from '@/lib/shopify/admin.server';

function money(value: number, currency = 'USD') {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(value);
}

/**
 * Pedidos sincronizados desde Shopify (nombre, correo, dirección, país y SKU).
 * Los datos se piden con la contraseña del panel y se validan en el servidor.
 */
export function ShopifyOrdersPanel() {
  const fetchOrders = useServerFn(listShopifyOrders);
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrders({ data: { limit: 25, adminToken: getAdminToken() } });
      if (!res.ok) setError(res.error ?? 'No se pudieron leer los pedidos de Shopify.');
      setOrders(res.orders);
    } catch {
      setError('No se pudieron leer los pedidos de Shopify.');
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <ShoppingBag className="h-5 w-5" /> Pedidos sincronizados de Shopify
          </h2>
          <p className="text-sm text-muted-foreground">
            Nombre, correo, dirección, país y los productos con su SKU (el mismo código que usás en SUP).
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      </div>

      {error && <p className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">{error}</p>}

      {!error && !loading && !orders.length && (
        <p className="rounded-md border p-6 text-sm text-muted-foreground">
          Todavía no hay pedidos en tu tienda de Shopify.
        </p>
      )}

      <ul className="space-y-4">
        {orders.map((order) => (
          <li key={order.id} className="rounded-lg border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {order.number} · {order.customer}
                  {order.country ? ` · ${order.country}` : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString('es-PE') : ''}
                  {order.email ? ` · ${order.email}` : ''}
                  {order.phone ? ` · ${order.phone}` : ''}
                </p>
                {order.address && <p className="mt-1 text-sm text-muted-foreground">{order.address}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-medium">{money(order.total, order.currency)}</span>
                <div className="flex gap-2">
                  {order.financialStatus && <Badge variant="secondary">{order.financialStatus}</Badge>}
                  {order.fulfillmentStatus && <Badge variant="outline">{order.fulfillmentStatus}</Badge>}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-1 text-sm">
              {order.lines.map((line, index) => (
                <p key={`${order.id}-${index}`} className="text-muted-foreground">
                  {line.title}
                  {line.variantTitle ? ` · ${line.variantTitle}` : ''} × {line.quantity}
                  {line.sku ? (
                    <>
                      {' · SKU '}
                      <a className="underline underline-offset-4" href={`/productos/${encodeURIComponent(line.sku)}`}>
                        {line.sku}
                      </a>
                    </>
                  ) : (
                    ' · sin SKU'
                  )}
                </p>
              ))}
              {!order.lines.length && <p className="text-muted-foreground">Pedido sin líneas.</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
