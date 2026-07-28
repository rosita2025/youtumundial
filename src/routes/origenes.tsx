import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCatalogForAudit } from "@/lib/data/data-provider";
import type { Product } from "@/lib/data/types";
import {
  blockOrigin,
  clearBlockedOrigins,
  getBlockedOrigins,
  originGroupKey,
  originKey,
  unblockOrigin,
} from "@/lib/suppliers/origins";

export const Route = createFileRoute("/origenes")({
  head: () => ({
    meta: [
      { title: "Origen de productos importados — Youtumundial" },
      {
        name: "description",
        content:
          "Panel de auditoría: proveedor, tienda de origen y fecha de importación de cada producto, con desautorización rápida.",
      },
      { property: "og:title", content: "Origen de productos importados — Youtumundial" },
      {
        property: "og:description",
        content: "Auditá y desautorizá orígenes de productos importados a tu tienda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OriginsPanel,
});

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-PE");
}

function OriginsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => setBlocked(getBlockedOrigins());

  useEffect(() => {
    refresh();
    getCatalogForAudit()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { supplier: string; shopId: string; items: Product[]; lastImport: string }
    >();
    for (const product of products) {
      const origin = product.origin;
      const key = originGroupKey(origin);
      const entry = map.get(key) ?? {
        supplier: origin?.supplier ?? "desconocido",
        shopId: origin?.shopId ?? "sin-tienda",
        items: [],
        lastImport: origin?.importedAt ?? "",
      };
      entry.items.push(product);
      if ((origin?.importedAt ?? "") > entry.lastImport) entry.lastImport = origin?.importedAt ?? "";
      map.set(key, entry);
    }
    return [...map.entries()];
  }, [products]);

  const blockedSet = new Set(blocked);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Origen de los productos importados</h1>
        <p className="mt-2 text-muted-foreground">
          Revisá de qué proveedor y de qué tienda viene cada producto. Si un origen no es tuyo,
          desautorizalo y desaparece de la tienda al instante.
        </p>
      </header>

      {blocked.length > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm">
            {blocked.length} origen(es) desautorizado(s) en este navegador.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearBlockedOrigins();
              refresh();
            }}
          >
            Volver a autorizar todo
          </Button>
        </div>
      )}

      {loading && <p className="text-muted-foreground">Cargando catálogo…</p>}
      {!loading && products.length === 0 && (
        <p className="text-muted-foreground">No hay productos importados todavía.</p>
      )}

      <div className="space-y-8">
        {groups.map(([groupKey, group]) => {
          const groupBlocked = blockedSet.has(groupKey);
          return (
            <section key={groupKey} className="rounded-xl border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="text-lg font-medium">
                    {group.supplier} · {group.shopId}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {group.items.length} producto(s) · última importación {formatDate(group.lastImport)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {groupBlocked ? (
                    <>
                      <Badge variant="destructive">Desautorizado</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          unblockOrigin(groupKey);
                          refresh();
                        }}
                      >
                        Autorizar
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        blockOrigin(groupKey);
                        refresh();
                      }}
                    >
                      Desautorizar origen
                    </Button>
                  )}
                </div>
              </div>

              <ul className="divide-y">
                {group.items.map((product) => {
                  const key = originKey(product.origin);
                  const itemBlocked = groupBlocked || blockedSet.has(key);
                  return (
                    <li
                      key={product.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.title}</p>
                        <p className="text-xs text-muted-foreground">
                          ID origen: {product.origin?.sourceId ?? product.id} · importado{" "}
                          {formatDate(product.origin?.importedAt)}
                        </p>
                      </div>
                      {itemBlocked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={groupBlocked}
                          onClick={() => {
                            unblockOrigin(key);
                            refresh();
                          }}
                        >
                          Autorizar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            blockOrigin(key);
                            refresh();
                          }}
                        >
                          Desautorizar producto
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
