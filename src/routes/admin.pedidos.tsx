import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, PackageCheck, RefreshCw, Truck, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSupPaymentLink, listOrders, type AdminOrder } from "@/lib/admin/orders.functions";

const SUP_ORDERS_URL = "https://www.supdropshipping.com/member/order";
const SUP_WALLET_URL = "https://www.supdropshipping.com/member/wallet";

export const Route = createFileRoute("/admin/pedidos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pedidos y pagos a SUP | Youtumundial" },
      {
        name: "description",
        content:
          "Panel de pedidos de Youtumundial: cobros de Stripe, pedidos creados en SUP Dropshipping, pago al proveedor y seguimiento internacional.",
      },
      { property: "og:title", content: "Pedidos y pagos a SUP | Youtumundial" },
      {
        property: "og:description",
        content: "Seguimiento de cada compra: cobro, pedido en SUP, pago al proveedor y tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersAdmin,
});

const ACTION_LABEL: Record<AdminOrder["action"], { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pagar_en_sup: { text: "Pagar en SUP", variant: "destructive" },
  crear_pedido_sup: { text: "Falta crear en SUP", variant: "destructive" },
  en_transito: { text: "Pagado · en camino", variant: "secondary" },
  manual: { text: "Preparación manual", variant: "outline" },
};

function money(value: number | undefined, currency = "USD") {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(value);
}

function OrdersAdmin() {
  const fetchOrders = useServerFn(listOrders);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<"live" | "sandbox">("live");

  const load = useCallback(
    async (env: "live" | "sandbox") => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchOrders({ data: { environment: env } });
        if (!result.ok) setError(result.message ?? "No se pudieron leer los pedidos.");
        setOrders(result.orders);
      } catch (e) {
        setError((e as Error).message);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchOrders],
  );

  useEffect(() => {
    void load(environment);
  }, [load, environment]);

  const payLink = useServerFn(getSupPaymentLink);
  const [paying, setPaying] = useState<string | null>(null);

  async function openPayment(supOrderId: string) {
    setPaying(supOrderId);
    try {
      const result = await payLink({ data: { supOrderId } });
      if (result.ok && result.url) window.open(result.url, "_blank", "noopener");
      else setError(result.message ?? "No se pudo abrir el pago en SUP.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPaying(null);
    }
  }

  const pendientes = orders.filter((o) => o.action === "pagar_en_sup" || o.action === "crear_pedido_sup").length;


  return (
    <main className="container mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Pedidos</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cada compra pagada en tu tienda crea el pedido en SUP Dropshipping automáticamente. Lo único manual es
            pagarlo con tu wallet de SUP: ahí se cubre el producto (1688 / Alibaba) y el envío internacional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnvironment(environment === "live" ? "sandbox" : "live")}
          >
            {environment === "live" ? "Ventas reales" : "Modo prueba"}
          </Button>
          <Button size="sm" onClick={() => void load(environment)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Pedidos pagados</p>
          <p className="mt-1 text-2xl font-semibold">{orders.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Esperando tu pago en SUP</p>
          <p className="mt-1 text-2xl font-semibold">{pendientes}</p>
        </div>
        <div className="flex flex-col justify-between rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Tu saldo de proveedor</p>
          <a
            className="mt-1 inline-flex items-center text-sm font-medium underline underline-offset-4"
            href={SUP_WALLET_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Wallet className="mr-2 h-4 w-4" /> Abrir wallet de SUP
          </a>
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !orders.length && !error && (
        <p className="rounded-md border p-6 text-sm text-muted-foreground">
          Todavía no hay compras pagadas en este modo.
        </p>
      )}

      <ul className="space-y-4">
        {orders.map((order) => {
          const label = ACTION_LABEL[order.action];
          const margen =
            order.supCost !== undefined ? order.amountPaid - order.supCost : undefined;

          return (
            <li key={order.sessionId} className="rounded-lg border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {order.customer} · {order.country}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString("es-PE")} · {order.email}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{order.address}</p>
                </div>
                <Badge variant={label.variant}>{label.text}</Badge>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Te pagó el cliente</p>
                  <p className="font-medium">{money(order.amountPaid, order.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costo en SUP</p>
                  <p className="font-medium">{money(order.supCost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Envío internacional</p>
                  <p className="font-medium">{money(order.supShippingCost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tu ganancia</p>
                  <p className="font-medium">{money(margen, order.currency)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1 text-sm">
                {order.items.map((item, index) => (
                  <p key={`${order.sessionId}-${index}`} className="text-muted-foreground">
                    <PackageCheck className="mr-2 inline h-4 w-4" />
                    SPU {item.supProductId} · {item.variantTitle || "sin variante"} × {item.quantity}
                  </p>
                ))}
                {!order.items.length && (
                  <p className="text-muted-foreground">Pedido sin productos de SUP (se prepara a mano).</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {order.supOrderId && (
                  <span className="text-muted-foreground">
                    Pedido SUP <strong className="text-foreground">{order.supOrderId}</strong>
                    {order.supStatus ? ` · ${order.supStatus}` : ""}
                  </span>
                )}
                {order.tracking && (
                  <span className="text-muted-foreground">
                    <Truck className="mr-2 inline h-4 w-4" />
                    {order.carrier ? `${order.carrier} · ` : ""}
                    {order.tracking}
                  </span>
                )}
                <a
                  className="inline-flex items-center font-medium underline underline-offset-4"
                  href={SUP_ORDERS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir en SUP <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
