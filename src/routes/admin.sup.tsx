import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ClipboardCopy, Download, PackageSearch, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchSupProducts, supStatus } from "@/lib/suppliers/sup.functions";
import { mergeSupCatalog, readSupCatalog, clearSupCatalog } from "@/lib/suppliers/local-catalog";
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

  const [status, setStatus] = useState<{ base: string; hasKey: boolean; hasSecret: boolean; hasToken: boolean } | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SupRawProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stored, setStored] = useState<SupRawProduct[]>([]);

  useEffect(() => {
    getStatus().then(setStatus).catch(() => setStatus(null));
    setStored(readSupCatalog());
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

  function importAll(items: SupRawProduct[]) {
    if (items.length === 0) return;
    const { added, total } = mergeSupCatalog(items);
    setStored(readSupCatalog());
    toast.success(`${added} productos nuevos importados`, { description: `Catálogo SUP: ${total} productos.` });
  }

  const connected = Boolean(status?.hasToken || (status?.hasKey && status?.hasSecret));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-medium">Importar productos de SUP Dropshipping</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Conectado a la Open API de SUP. Buscá productos, importalos y aparecen en tu tienda con el margen
        configurado (60%).
      </p>

      <section className="mt-6 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? "Credenciales cargadas" : "Faltan credenciales"}
          </Badge>
          {status && <span className="text-xs text-muted-foreground">API: {status.base}</span>}
          <Badge variant="outline">{stored.length} productos importados</Badge>
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
            Guardá el token de la Open API de SUP en los secretos del proyecto (<code>SUP_ACCESS_TOKEN</code>) o
            el par <code>SUP_APP_KEY</code> / <code>SUP_APP_SECRET</code>.
          </p>
        )}
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
          <Button onClick={() => search(1)} disabled={loading}>
            <PackageSearch className="mr-2 h-4 w-4" /> Buscar
          </Button>
          <Button variant="outline" onClick={() => search(page)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Recargar
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
                <p className="text-xs text-muted-foreground">
                  Costo ${Number(p.cost_price) || 0} → venta ${retailPrice(Number(p.cost_price) || 0)}
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => importAll([p])}>
                  Importar
                </Button>
              </div>
            </li>
          ))}
        </ul>

        {results.length > 0 && (
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" size="sm" disabled={page <= 1 || loading} onClick={() => search(page - 1)}>
              Anterior
            </Button>
            <Button variant="ghost" size="sm" disabled={loading} onClick={() => search(page + 1)}>
              Siguiente
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
