import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, ExternalLink, PackageCheck, RefreshCw, Truck, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getSupPaymentLink,
  listOrders,
  markNotified,
  notifyShipped,
  syncTracking,
  type AdminOrder,
} from "@/lib/admin/orders.functions";

const SUP_ORDERS_URL = "https://www.supdropshipping.com/member/order";
const SUP_WALLET_URL = "https://www.supdropshipping.com/member/wallet";
/** Cada cuánto se refresca solo el panel (ms). */
const AUTO_SYNC_MS = 120_000;


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
  en_transito: { text: "Pagado · preparando", variant: "secondary" },
  enviado: { text: "Despachado · con tracking", variant: "default" },
  manual: { text: "Preparación manual", variant: "outline" },
};

function money(value: number | undefined, currency = "USD") {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(value);
}

function OrdersAdmin() {
  const fetchOrders = useServerFn(listOrders);
  const runSync = useServerFn(syncTracking);
  const sendNotice = useServerFn(notifyShipped);
  const setNotified = useServerFn(markNotified);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
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

  /** Consulta SUP, guarda el tracking y avisa a los clientes despachados. */
  const sync = useCallback(
    async (env: "live" | "sandbox", silent = false) => {
      setSyncing(true);
      try {
        const result = await runSync({ data: { environment: env } });
        if (!result.ok) {
          if (!silent) setError(result.message ?? "No se pudo sincronizar con SUP.");
        } else if (!silent) {
          setNotice(
            `Sincronizados ${result.checked} pedidos · ${result.updated} actualizados · ${result.notified} clientes avisados.`,
          );
        }
        await load(env);
      } catch (e) {
        if (!silent) setError((e as Error).message);
      } finally {
        setSyncing(false);
      }
    },
    [runSync, load],
  );

  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    void load(environment);
    void syncRef.current(environment, true);
    const timer = setInterval(() => void syncRef.current(environment, true), AUTO_SYNC_MS);
    return () => clearInterval(timer);
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

  async function notifyOne(order: AdminOrder) {
    setBusyOrder(order.sessionId);
    setError(null);
    try {
      const result = await sendNotice({ data: { sessionId: order.sessionId, environment } });
      if (result.ok) {
        setNotice(result.message);
        await load(environment);
      } else {
        // Sin servicio de email: abrimos el correo del cliente ya escrito.
        const subject = encodeURIComponent(`Tu pedido ${order.supOrderId ?? ""} ya fue enviado`);
        const body = encodeURIComponent(
          `Hola ${order.customer},\n\nTu pedido de Youtumundial ya fue despachado${order.carrier ? ` con ${order.carrier}` : ""}.\n` +
            `Número de seguimiento: ${order.tracking ?? ""}\n\n` +
            `El envío es internacional: el rastreo puede tardar hasta 72 h en mostrar movimientos.\n\nGracias por tu compra.`,
        );
        window.open(`mailto:${order.email}?subject=${subject}&body=${body}`, "_blank", "noopener");
        setNotice(`${result.message} Te abrí el email listo para enviar.`);
        await setNotified({ data: { sessionId: order.sessionId, environment } });
        await load(environment);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyOrder(null);
    }
  }

  const pendientes = orders.filter((o) => o.action === "pagar_en_sup" || o.action === "crear_pedido_sup").length;
  const despachados = orders.filter((o) => o.action === "enviado").length;



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
                {order.supOrderId && order.action === "pagar_en_sup" && (
                  <Button
                    size="sm"
                    onClick={() => void openPayment(order.supOrderId!)}
                    disabled={paying === order.supOrderId}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {paying === order.supOrderId ? "Abriendo…" : "Pagar al proveedor"}
                  </Button>
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
