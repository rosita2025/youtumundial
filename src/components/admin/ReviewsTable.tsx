import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Eye, EyeOff, Save, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { importedReviews, type Review } from "@/lib/reviews/reviews";
import {
  readLocalReviews,
  writeLocalReviews,
  subscribeLocalReviews,
  type ReviewsBySlugMap,
} from "@/lib/reviews/local-store";

const PAGE_SIZE = 10;

interface Row extends Review {
  slug: string;
  index: number;
  source: "panel" | "archivo";
}

/** Une las reseñas del archivo con las publicadas desde el panel. */
function buildRows(local: ReviewsBySlugMap): Row[] {
  const slugs = new Set([...Object.keys(importedReviews), ...Object.keys(local)]);
  const rows: Row[] = [];
  for (const slug of slugs) {
    const fromPanel = local[slug];
    const list = fromPanel ?? importedReviews[slug] ?? [];
    list.forEach((review, index) => {
      rows.push({ ...review, slug, index, source: fromPanel ? "panel" : "archivo" });
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

/** Materializa las reseñas del archivo en el store local para poder editarlas. */
function listFor(local: ReviewsBySlugMap, slug: string): Review[] {
  return [...(local[slug] ?? importedReviews[slug] ?? [])];
}

export function ReviewsTable() {
  const [local, setLocal] = useState<ReviewsBySlugMap>({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"todas" | "publicadas" | "ocultas">("todas");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{ slug: string; index: number } | null>(null);
  const [draft, setDraft] = useState<Review | null>(null);

  useEffect(() => {
    const sync = () => setLocal({ ...readLocalReviews() });
    sync();
    return subscribeLocalReviews(sync);
  }, []);

  const rows = useMemo(() => buildRows(local), [local]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const isPublished = r.published !== false;
      if (status === "publicadas" && !isPublished) return false;
      if (status === "ocultas" && isPublished) return false;
      if (!q) return true;
      return (
        r.slug.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
      );
    });
  }, [rows, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function update(slug: string, index: number, patch: Partial<Review> | null) {
    const base = { ...readLocalReviews() };
    const list = listFor(base, slug);
    if (!list[index]) return;
    if (patch === null) list.splice(index, 1);
    else list[index] = { ...list[index], ...patch };
    if (list.length) base[slug] = list;
    else delete base[slug];
    writeLocalReviews(base);
    setLocal(base);
  }

  function startEdit(row: Row) {
    setEditing({ slug: row.slug, index: row.index });
    const { slug: _s, index: _i, source: _src, ...review } = row;
    setDraft(review);
  }

  function saveEdit() {
    if (!editing || !draft) return;
    if (!draft.author.trim() || draft.body.trim().length < 4) {
      toast.error("Faltan el nombre o el comentario.");
      return;
    }
    update(editing.slug, editing.index, {
      ...draft,
      author: draft.author.trim(),
      body: draft.body.trim(),
      title: draft.title?.trim() || draft.body.trim().slice(0, 40),
      rating: Math.min(5, Math.max(1, Number(draft.rating) || 5)),
    });
    setEditing(null);
    setDraft(null);
    toast.success("Reseña actualizada");
  }

  function remove(row: Row) {
    update(row.slug, row.index, null);
    toast.success("Reseña borrada", { description: `${row.author} · ${row.slug}` });
  }

  const published = rows.filter((r) => r.published !== false).length;

  return (
    <section className="mb-6 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Reseñas cargadas</h2>
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary">{rows.length} en total</Badge>
          <Badge variant="secondary">{published} publicadas</Badge>
          <Badge variant="secondary">{rows.length - published} ocultas</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por producto, autor o texto"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["todas", "publicadas", "ocultas"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => {
                setStatus(s);
                setPage(0);
              }}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No hay reseñas que coincidan. Importá desde 1688 o esperá las de tus clientes.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Producto</th>
                <th className="py-2 pr-3">Autor</th>
                <th className="py-2 pr-3">★</th>
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Comentario</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const isEditing = editing?.slug === row.slug && editing.index === row.index;
                if (isEditing && draft) {
                  return (
                    <tr key={`${row.slug}-${row.index}`} className="border-b align-top">
                      <td colSpan={7} className="py-4">
                        <div className="grid gap-3 sm:grid-cols-4">
                          <Input
                            value={draft.author}
                            onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                            placeholder="Autor"
                          />
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={draft.rating}
                            onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}
                            placeholder="Estrellas"
                          />
                          <Input
                            type="date"
                            value={draft.date}
                            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                          />
                          <Input
                            value={draft.size ?? ""}
                            onChange={(e) => setDraft({ ...draft, size: e.target.value })}
                            placeholder="Talla"
                          />
                        </div>
                        <Textarea
                          className="mt-3"
                          rows={3}
                          value={draft.body}
                          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                        />
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="mr-2 h-4 w-4" /> Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(null);
                              setDraft(null);
                            }}
                          >
                            <X className="mr-2 h-4 w-4" /> Cancelar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`${row.slug}-${row.index}`} className="border-b align-top">
                    <td className="py-3 pr-3 font-mono text-xs">{row.slug}</td>
                    <td className="py-3 pr-3">{row.author}</td>
                    <td className="py-3 pr-3">{row.rating}</td>
                    <td className="py-3 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                      {row.date}
                    </td>
                    <td className="max-w-[280px] py-3 pr-3 text-xs text-muted-foreground">
                      <span className="line-clamp-2">{row.body}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant={row.published === false ? "outline" : "secondary"}>
                        {row.published === false ? "Oculta" : "Publicada"}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title={row.published === false ? "Publicar" : "Ocultar"}
                          onClick={() =>
                            update(row.slug, row.index, { published: row.published === false })
                          }
                        >
                          {row.published === false ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => startEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Borrar"
                          onClick={() => remove(row)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filtered.length} reseñas · página {current + 1} de {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={current >= pageCount - 1}
                onClick={() => setPage(current + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
