import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ClipboardCopy, Download, Link as LinkIcon, PackageSearch, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  fetchSupProducts,
  fetchSupMemberProducts,
  importFromSourceUrl,
  resyncStoreCatalog,
  supStatus,
} from "@/lib/suppliers/sup.functions";

import { mergeSupCatalog, readSupCatalog, clearSupCatalog } from "@/lib/suppliers/local-catalog";
import { readPublishedIds, togglePublished, clearPublished } from "@/lib/suppliers/published-store";
import { retailPrice } from "@/lib/suppliers/sup";
import type { SupRawProduct } from "@/lib/suppliers/sup";

export const Route = createFileRoute("/admin/sup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Importar productos de SUP | Youtumundial" },
      { name: "description", content: "Panel para conectar la Open API de SUP Dropshipping e importar productos al catálogo de Youtumundial." },
      { property: "og:title", content: "Importar productos de SUP | Youtumundial" },
      { property: "og:description", content: "Conectá SUP Dropshipping e importá ropa al catálogo de Youtumundial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupAdmin,
});

function SupAdmin() {
  const getStatus = useServerFn(supStatus);
  const getProducts = useServerFn(fetchSupProducts);
  const getMemberProducts = useServerFn(fetchSupMemberProducts);
  const importByUrl = useServerFn(importFromSourceUrl);
  const resyncCatalog = useServerFn(resyncStoreCatalog);

  const [status, setStatus] = useState<{ base: string; hasKey: boolean; hasSecret: boolean; hasToken: boolean; hasUsername?: boolean; hasPassword?: boolean } | null>(null);
  const [keyword, setKeyword] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSource, setMemberSource] = useState<"all" | "listed" | "queue">("all");
  const [results, setResults] = useState<SupRawProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stored, setStored] = useState<SupRawProduct[]>([]);
  const [published, setPublished] = useState<string[]>([]);


  useEffect(() => {
    getStatus().then(setStatus).catch(() => setStatus(null));
    setStored(readSupCatalog());
    setPublished(readPublishedIds());
  }, [getStatus]);


  async function search(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts({ data: { page: nextPage, pageSize: 20, keyword } });
      if (!res.ok) {
        setError(res.error ?? "No se pudo consultar SUP.");
        setResults([]);
      } else {
        setResults(res.products);
        setPage(nextPage);
        if (res.products.length === 0) setError("SUP no devolvió productos para esa búsqueda.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMemberCenter(nextPage = page) {
    setMemberLoading(true);
    setError(null);
    try {
      const res = await getMemberProducts({ data: { page: nextPage, pageSize: 40, keyword, source: memberSource } });
      if (!res.ok) {
        setError(res.error ?? "No se pudo leer tu Member Center de SUP.");
        setResults([]);
      } else {
        setResults(res.products);
        setPage(nextPage);
        toast.success(`SUP Member Center: ${res.products.length} productos`, {
          description: `${res.listedCount} listados · ${res.queueCount} en cola importada`,
        });
        if (res.products.length === 0) setError("No encontré productos en tu Member Center con ese filtro.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMemberLoading(false);
    }
  }

  function importAll(items: SupRawProduct[]) {
    if (items.length === 0) return;
    const { added, total } = mergeSupCatalog(items);
    setStored(readSupCatalog());
    toast.success(`${added} productos nuevos importados`, { description: `Catálogo SUP: ${total} productos.` });
  }

  async function importUrl() {
    if (!sourceUrl.trim()) return;
    setUrlLoading(true);
    setError(null);
    try {
      const res = await importByUrl({ data: { url: sourceUrl } });
      if (!res.ok) {
        setError(res.error ?? "No se pudo importar esa URL.");
      } else {
        setResults(res.products);
        importAll(res.products);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUrlLoading(false);
    }
  }

  async function resync() {
    setUrlLoading(true);
    try {
      const res = await resyncCatalog();
      if (res.ok) toast.success(`Tienda sincronizada: ${res.count} productos actualizados desde SUP.`);
      else toast.error(res.error ?? "No se pudo sincronizar.");
    } finally {
      setUrlLoading(false);
    }
  }



  const connected = Boolean(status?.hasToken || (status?.hasKey && status?.hasSecret) || (status?.hasUsername && status?.hasPassword));
  const busy = loading || memberLoading || urlLoading;
  const salePrice = (p: SupRawProduct) => Number(p.retail_price) || retailPrice(Number(p.cost_price) || 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-medium">Importar productos de SUP Dropshipping</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sincronizá lo que ya importaste en SUP desde 1688, AliExpress, Alibaba y otros proveedores para publicarlo
        en Youtumundial con fotos, talles, precios y variantes reales.
      </p>

      <section className="mt-6 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? "Credenciales cargadas" : "Faltan credenciales"}
          </Badge>
          {status && <span className="text-xs text-muted-foreground">API: {status.base}</span>}
          <Badge variant="outline">{stored.length} productos importados</Badge>
          <Badge variant={published.length > 0 ? "default" : "secondary"}>
            {published.length > 0 ? `${published.length} publicados en mi tienda` : "Mostrando todo el catálogo"}
          </Badge>
          {published.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { clearPublished(); setPublished([]); toast.success("Selección borrada: la tienda vuelve a mostrar todo."); }}>
              Mostrar todo
            </Button>
          )}
          {stored.length > 0 && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  const ids = stored.map((p) => String(p.id));
                  navigator.clipboard?.writeText(JSON.stringify(ids));
                  toast.success("IDs copiados", {
                    description: `Pegá esta lista en el chat de Lovable para publicarlos: ${ids.join(", ")}`,
                  });
                }}
              >
                <ClipboardCopy className="mr-2 h-4 w-4" /> Copiar IDs para publicar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { clearSupCatalog(); setStored([]); }}>
                <Trash2 className="mr-2 h-4 w-4" /> Vaciar catálogo importado
              </Button>
            </>
          )}

        </div>
        {!connected && (
          <p className="mt-3 text-sm text-muted-foreground">
            Guardá <code>SUP_USERNAME</code> y <code>SUP_PASSWORD</code> en los secretos del proyecto para leer el Member Center real.
          </p>
        )}

        <div className="mt-4 border-t pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline" onClick={runHealth} disabled={healthLoading}>
              <Stethoscope className="mr-2 h-4 w-4" />
              {healthLoading ? "Revisando SUP…" : "Revisar conexión con SUP"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Te dice exactamente en qué paso falla cuando no aparecen productos.
            </span>
          </div>
          {health && (
            <ul className="mt-3 space-y-2">
              {health.map((s) => (
                <li key={s.step} className="flex items-start gap-2 text-sm">
                  <Badge variant={s.ok ? "default" : "destructive"} className="mt-0.5 shrink-0">
                    {s.ok ? "OK" : "Falla"}
                  </Badge>
                  <span>
                    <strong className="font-medium">{s.step}</strong>
                    <span className="block text-xs text-muted-foreground">{s.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>


      <section className="mt-6 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Productos reales de tu Member Center</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Lee los productos de SUP que ya importaste o listaste en una tienda, aunque la Open API pública no los encuentre.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "listed", "queue"] as const).map((source) => (
              <Button
                key={source}
                size="sm"
                variant={memberSource === source ? "default" : "outline"}
                onClick={() => setMemberSource(source)}
              >
                {source === "all" ? "Todo" : source === "listed" ? "Listados" : "Importados"}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="SKU o nombre: SD07270217065461…"
            onKeyDown={(e) => e.key === "Enter" && loadMemberCenter(1)}
          />
          <Button onClick={() => loadMemberCenter(1)} disabled={busy}>
            <Download className="mr-2 h-4 w-4" /> Traer de mi SUP
          </Button>
          {results.length > 0 && (
            <Button variant="secondary" onClick={() => importAll(results)}>
              Publicar/importar los {results.length}
            </Button>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-medium">Importar por URL (1688 · AliExpress · Alibaba)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pegá el link del producto y lo busco en tu catálogo de SUP con fotos, talles y costo reales.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            className="max-w-lg"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://detail.1688.com/offer/123456789.html"
            onKeyDown={(e) => e.key === "Enter" && importUrl()}
          />
          <Button onClick={importUrl} disabled={busy}>
            <LinkIcon className="mr-2 h-4 w-4" /> Buscar e importar
          </Button>
          <Button variant="outline" onClick={resync} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" /> Resincronizar tienda
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5">

        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Buscar en SUP (ej. hoodie, t-shirt)…"
            onKeyDown={(e) => e.key === "Enter" && search(1)}
          />
          <Button onClick={() => search(1)} disabled={busy}>
            <PackageSearch className="mr-2 h-4 w-4" /> Buscar Open API
          </Button>
          <Button variant="outline" onClick={() => loadMemberCenter(page)} disabled={busy}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Recargar Member Center
          </Button>
          {results.length > 0 && (
            <Button variant="secondary" onClick={() => importAll(results)}>
              <Download className="mr-2 h-4 w-4" /> Importar los {results.length}
            </Button>
          )}
        </div>

        {error && <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{error}</p>}

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {results.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-lg border p-3">
              {p.images?.[0] && (
                <img src={p.images[0]} alt={p.name} className="h-20 w-20 rounded object-cover" loading="lazy" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline">{p.source === "member-listed" ? "Listado" : p.source === "member-queue" ? "Importado" : "Open API"}</Badge>
                  {published.includes(String(p.id)) && <Badge>En mi tienda</Badge>}
                  {p.variants?.length ? <Badge variant="secondary">{p.variants.length} variantes</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Costo ${Number(p.cost_price) || 0} → venta ${salePrice(p)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={published.includes(String(p.id)) ? "default" : "outline"}
                    onClick={() => {
                      const now = togglePublished(p.id);
                      setPublished(readPublishedIds());
                      toast.success(now ? "Publicado en tu tienda" : "Quitado de tu tienda");
                    }}
                  >
                    {published.includes(String(p.id)) ? "Quitar de mi tienda" : "Publicar en mi tienda"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => importAll([p])}>
                    Importar
                  </Button>
                </div>
              </div>

            </li>
          ))}
        </ul>

        {results.length > 0 && (
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" size="sm" disabled={page <= 1 || loading} onClick={() => search(page - 1)}>
              Anterior
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => loadMemberCenter(page + 1)}>
              Siguiente
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
