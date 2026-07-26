import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Check, X, Star, ExternalLink, Images, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  readPending,
  removePending,
  clearPending,
  subscribePending,
  type PendingReview,
} from "@/lib/reviews/moderation";
import { readLocalReviews, writeLocalReviews, type ReviewsBySlugMap } from "@/lib/reviews/local-store";
import { mergeReviews, type ReviewsBySlug } from "@/lib/reviews/import-1688";
import existingFile from "@/lib/reviews/reviews-1688.json";

const existingReviews = ((existingFile as { reviews?: ReviewsBySlug }).reviews ?? {}) as ReviewsBySlug;

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= value ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

/** Cola de revisión: aprobar o descartar reseñas importadas antes de publicarlas. */
export function ModerationQueue() {
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setPending(readPending());
    sync();
    return subscribePending(sync);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((p) =>
      `${p.slug} ${p.review.author} ${p.review.body} ${p.evidence.origin}`.toLowerCase().includes(q),
    );
  }, [pending, query]);

  function approve(items: PendingReview[]) {
    if (items.length === 0) return;
    const bySlug: ReviewsBySlug = {};
    for (const item of items) (bySlug[item.slug] ||= []).push(item.review);

    const merged = mergeReviews(
      { ...existingReviews, ...(readLocalReviews() as ReviewsBySlug) },
      bySlug,
    );
    writeLocalReviews(merged.merged as ReviewsBySlugMap);
    removePending(items.map((i) => i.id));
    setSelected(new Set());
    toast.success(`${merged.added} reseñas publicadas`, {
      description: merged.duplicates
        ? `${merged.duplicates} se descartaron por duplicadas.`
        : "Ya se ven en la ficha del producto.",
    });
  }

  function discard(items: PendingReview[]) {
    if (items.length === 0) return;
    removePending(items.map((i) => i.id));
    setSelected(new Set());
    toast.success(`${items.length} reseñas descartadas`);
  }

  const selectedItems = filtered.filter((p) => selected.has(p.id));

  return (
    <section className="mb-6 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <ShieldCheck className="h-4 w-4" />
          Revisión antes de publicar
          <Badge variant={pending.length ? "default" : "secondary"}>{pending.length}</Badge>
        </h2>
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => approve(selectedItems.length ? selectedItems : filtered)}>
              <Check className="mr-2 h-4 w-4" />
              {selectedItems.length ? `Aprobar ${selectedItems.length}` : "Aprobar todas"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => discard(selectedItems.length ? selectedItems : filtered)}
            >
              <X className="mr-2 h-4 w-4" />
              {selectedItems.length ? `Descartar ${selectedItems.length}` : "Descartar todas"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { clearPending(); setSelected(new Set()); }}>
              <Trash2 className="mr-2 h-4 w-4" />
              Vaciar cola
            </Button>
          </div>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        Todo lo que importás de 1688 entra acá con su evidencia (autor, estrellas, fotos y origen). Nada se
        publica hasta que lo apruebes.
      </p>

      {pending.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No hay reseñas esperando revisión.
        </p>
      ) : (
        <>
          <Input
            className="mt-4"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por producto, autor, texto u origen…"
          />

          <ul className="mt-4 space-y-3">
            {filtered.map((item) => (
              <li key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={selected.has(item.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        e.target.checked ? next.add(item.id) : next.delete(item.id);
                        setSelected(next);
                      }}
                      aria-label={`Seleccionar reseña de ${item.review.author}`}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{item.evidence.author}</span>
                        <Stars value={item.evidence.rating} />
                        <Badge variant="secondary">{item.slug}</Badge>
                        {item.review.size && <Badge variant="outline">Talla {item.review.size}</Badge>}
                        <span className="text-xs text-muted-foreground">{item.review.date}</span>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm">{item.review.body}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve([item])}>
                      <Check className="mr-1 h-4 w-4" />
                      Publicar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => discard([item])}>
                      <X className="mr-1 h-4 w-4" />
                      Descartar
                    </Button>
                  </div>
                </div>

                {item.evidence.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Images className="h-3.5 w-3.5 text-muted-foreground" />
                    {item.evidence.photos.slice(0, 8).map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setZoom(src)}
                        className="overflow-hidden rounded border"
                      >
                        <img src={src} alt={`Foto de ${item.evidence.author}`} className="h-14 w-14 object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-2 text-xs text-muted-foreground">
                  <span>Origen: {item.evidence.source}</span>
                  {/^https?:\/\//.test(item.evidence.origin) ? (
                    <a
                      href={item.evidence.origin}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {item.evidence.productTitle || item.evidence.origin.slice(0, 60)}
                    </a>
                  ) : (
                    <span>{item.evidence.origin}</span>
                  )}
                  <span>Importada {new Date(item.evidence.importedAt).toLocaleString("es-PE")}</span>
                  <a className="underline" href={`/products/${item.slug}`} target="_blank" rel="noreferrer">
                    Ver producto
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setZoom(null)}
          role="presentation"
        >
          <img src={zoom} alt="Evidencia ampliada" className="max-h-[80vh] max-w-full rounded" />
        </div>
      )}
    </section>
  );
}
