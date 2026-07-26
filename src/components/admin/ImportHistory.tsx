import { useEffect, useMemo, useState } from "react";
import { History, Trash2, ChevronLeft, ChevronRight, Link2, ClipboardPaste, FileJson } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  readImportLog,
  clearImportLog,
  subscribeImportLog,
  type ImportLogEntry,
} from "@/lib/reviews/import-log";

const PAGE_SIZE = 8;

const sourceLabel: Record<ImportLogEntry["source"], string> = {
  url: "URL de 1688",
  pegado: "Texto/HTML pegado",
  archivo: "Archivo",
  manual: "Manual",
};

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
});

function SourceIcon({ source }: { source: ImportLogEntry["source"] }) {
  if (source === "url") return <Link2 className="h-3.5 w-3.5" />;
  if (source === "pegado") return <ClipboardPaste className="h-3.5 w-3.5" />;
  return <FileJson className="h-3.5 w-3.5" />;
}

export function ImportHistory() {
  const [entries, setEntries] = useState<ImportLogEntry[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const sync = () => setEntries(readImportLog());
    sync();
    return subscribeImportLog(sync);
  }, []);

  const totals = useMemo(
    () => ({
      published: entries.reduce((s, e) => s + e.published, 0),
      failed: entries.filter((e) => e.status === "error").length,
    }),
    [entries],
  );

  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = entries.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="mb-6 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <History className="h-4 w-4" />
          Historial de importaciones
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary">{entries.length} intentos</Badge>
          <Badge variant="secondary">{totals.published} publicadas</Badge>
          {totals.failed > 0 && <Badge variant="outline">{totals.failed} con error</Badge>}
          {entries.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                clearImportLog();
                setEntries([]);
                toast.success("Historial borrado");
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Borrar
            </Button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Todavía no hay importaciones registradas. Cada vez que traigas reseñas por URL, pegado o
          archivo, vas a ver acá la fecha, el origen y cuántas se publicaron.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Origen</th>
                <th className="py-2 pr-3">Producto</th>
                <th className="py-2 pr-3">Detectadas</th>
                <th className="py-2 pr-3">Publicadas</th>
                <th className="py-2 pr-3">Repetidas</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id} className="border-b align-top">
                  <td className="py-3 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                    {dateFormatter.format(new Date(e.date))}
                  </td>
                  <td className="max-w-[240px] py-3 pr-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <SourceIcon source={e.source} />
                      {sourceLabel[e.source]}
                    </span>
                    <span className="line-clamp-1 break-all text-xs text-muted-foreground">
                      {e.origin}
                    </span>
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs">{e.slug || "—"}</td>
                  <td className="py-3 pr-3">{e.found}</td>
                  <td className="py-3 pr-3">{e.published}</td>
                  <td className="py-3 pr-3">{e.duplicates}</td>
                  <td className="py-3">
                    <Badge
                      variant={
                        e.status === "ok" ? "secondary" : e.status === "parcial" ? "outline" : "destructive"
                      }
                    >
                      {e.status === "ok" ? "Publicado" : e.status === "parcial" ? "Parcial" : "Error"}
                    </Badge>
                    {e.message && (
                      <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">{e.message}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              página {current + 1} de {pageCount}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>
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
