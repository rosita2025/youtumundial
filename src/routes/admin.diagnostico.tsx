import { AdminGate } from "@/components/admin/AdminGate";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Info, Wrench, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getProducts } from "@/lib/data/data-provider";
import type { ReviewsBySlug } from "@/lib/reviews/import-1688";
import { readLocalReviews, writeLocalReviews } from "@/lib/reviews/local-store";
import { diagnoseSlug, diagnoseStore, remapSlug } from "@/lib/reviews/diagnose";

export const Route = createFileRoute("/admin/diagnostico")({
  component: () => (
    <AdminGate>
      <AdminDiagnosticoPage />
    </AdminGate>
  ),
  head: () => ({
    meta: [
      { title: "Diagnóstico de reseñas | Panel Youtumundial" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Panel interno para detectar por qué un producto no muestra reseñas y corregir el mapeo de slugs.",
      },
    ],
  }),
});

const sourceLabel: Record<string, string> = {
  overrides: "Escritas a mano en el código",
  local: "Publicadas desde el panel (este navegador)",
  file: "Archivo reviews-1688.json",
  generic: "Pool genérico de ejemplo (no son propias)",
};

function AdminDiagnosticoPage() {
  const [slug, setSlug] = useState("");
  const [catalogSlugs, setCatalogSlugs] = useState<string[] | null>(null);
  const [localReviews, setLocalReviews] = useState<ReviewsBySlug>({});
  const [remapTo, setRemapTo] = useState("");

  function reload() {
    setLocalReviews(readLocalReviews() as ReviewsBySlug);
    getProducts()
      .then((products) => setCatalogSlugs(products.map((p) => p.slug)))
      .catch(() => setCatalogSlugs([]));
  }

  useEffect(reload, []);

  const store = useMemo(
    () => (catalogSlugs ? diagnoseStore(catalogSlugs, localReviews) : null),
    [catalogSlugs, localReviews],
  );

  const diag = useMemo(
    () => (slug.trim() && catalogSlugs ? diagnoseSlug(slug, catalogSlugs, localReviews) : null),
    [slug, catalogSlugs, localReviews],
  );

  function applyRemap(from: string, to: string) {
    if (!from || !to) {
      toast.error("Elegí el slug de origen y el de destino");
      return;
    }
    const res = remapSlug(localReviews, from, to);
    writeLocalReviews(res.reviews);
    setLocalReviews(res.reviews);
    toast.success(`${res.moved} reseñas movidas a "${to}"`, {
      description: res.duplicates
        ? `${res.duplicates} se descartaron por duplicadas.`
        : "Ya se ven en la ficha del producto.",
    });
    setSlug(to);
    setRemapTo("");
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Panel interno</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Diagnóstico de reseñas</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Escribí el slug de un producto y te digo exactamente por qué no muestra reseñas: si el slug no
          existe, si el archivo está vacío, si quedaron guardadas bajo otro slug o si el merge las descartó
          por duplicadas.
        </p>
      </header>

      {store && (
        <section className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Productos", value: store.catalogSlugs.length },
            { label: "En el archivo JSON", value: store.fileTotal },
            { label: "Publicadas acá", value: store.localTotal },
            { label: "Sin reseñas propias", value: store.slugsWithoutOwnReviews.length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-4">
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </section>
      )}

      <section className="mb-6 rounded-xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <Search className="h-4 w-4" />
          Revisar un producto
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="merino-wool-runner"
            className="max-w-sm"
          />
          <Button variant="outline" onClick={reload}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recargar
          </Button>
        </div>

        {diag && (
          <div className="mt-6 space-y-4">
            <div
              className={`flex gap-3 rounded-lg border p-4 text-sm ${
                diag.problem ? "border-destructive/40 bg-destructive/5" : "border-primary/40 bg-primary/5"
              }`}
            >
              {diag.problem ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              )}
              <div>
                <p className="font-medium">
                  {diag.problem ?? `Todo bien: este producto muestra ${diag.ownTotal} reseñas propias.`}
                </p>
                {diag.hint && <p className="mt-1 text-muted-foreground">{diag.hint}</p>}
              </div>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <Row label="Slug en el catálogo" value={diag.existsInCatalog ? "Sí" : "No"} />
              <Row label="Origen de las reseñas" value={sourceLabel[diag.source]} />
              <Row label="En reviews-1688.json" value={String(diag.counts.file)} />
              <Row label="Publicadas en este navegador" value={String(diag.counts.local)} />
              <Row label="Escritas a mano (overrides)" value={String(diag.counts.overrides)} />
              <Row label="Descartadas por duplicadas" value={String(diag.duplicatesDropped)} />
            </div>

            {diag.existsInCatalog && (
              <Link
                to="/products/$slug"
                params={{ slug: diag.slug }}
                className="inline-block text-sm underline underline-offset-4"
              >
                Ver /products/{diag.slug}
              </Link>
            )}

            {diag.suggestions.length > 0 && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Wrench className="h-4 w-4" />
                  Corregir el mapeo
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Estos slugs tienen reseñas cargadas y se parecen al que buscás. Mové sus reseñas a{" "}
                  <code className="rounded bg-background px-1 py-0.5 text-xs">{diag.slug}</code>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {diag.suggestions.map((s) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => applyRemap(s, diag.slug)}>
                      Mover «{s}» → «{diag.slug}»
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {store && store.orphanSlugs.length > 0 && (
        <section className="mb-6 rounded-xl border bg-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Reseñas con slug que no existe
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estas reseñas están cargadas pero ningún producto las usa. Reasignalas al producto correcto.
          </p>
          <ul className="mt-4 space-y-3">
            {store.orphanSlugs.map((o) => (
              <li key={o.slug} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{o.slug}</code>
                <Badge variant="secondary">{o.count} reseñas</Badge>
                <Input
                  className="h-9 max-w-xs"
                  placeholder={o.suggestion ?? "slug correcto del producto"}
                  defaultValue={o.suggestion ?? ""}
                  onChange={(e) => setRemapTo(e.target.value)}
                  onFocus={(e) => setRemapTo(e.currentTarget.value)}
                />
                <Button size="sm" onClick={() => applyRemap(o.slug, remapTo || o.suggestion || "")}>
                  <Wrench className="mr-2 h-4 w-4" />
                  Corregir mapeo
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {store && (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <Info className="h-4 w-4" />
            Slugs del catálogo
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {store.catalogSlugs.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlug(s)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted ${
                  store.slugsWithoutOwnReviews.includes(s) ? "border-dashed text-muted-foreground" : ""
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Los slugs con borde punteado no tienen reseñas propias: muestran el pool genérico.
          </p>
        </section>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
