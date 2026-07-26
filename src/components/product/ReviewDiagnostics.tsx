/**
 * Vista de diagnóstico de reseñas dentro de la ficha de producto.
 *
 * Muestra cuántas reseñas vienen del JSON importado, cuántas están publicadas
 * en este navegador, los errores de carga y un botón que sugiere y aplica el
 * slug más parecido cuando las reseñas quedaron guardadas con otro nombre.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, RefreshCw, Wand2 } from "lucide-react";
import { closestSlug, diagnoseSlug, remapSlug } from "@/lib/reviews/diagnose";
import { importedReviews, reviewOverrides } from "@/lib/reviews/reviews";
import {
  LOCAL_REVIEWS_KEY,
  readLocalReviews,
  subscribeLocalReviews,
  writeLocalReviews,
  type ReviewsBySlugMap,
} from "@/lib/reviews/local-store";

function readLoadError(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.reviews !== "object") {
      return "El contenido guardado en este navegador no tiene el formato esperado ({ reviews: { slug: [...] } }).";
    }
    return null;
  } catch (error) {
    return `No se pudo leer lo publicado en este navegador: ${(error as Error).message}`;
  }
}

interface Props {
  slug: string;
}

export function ReviewDiagnostics({ slug }: Props) {
  const [local, setLocal] = useState<ReviewsBySlugMap>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLocal(readLocalReviews());
    setLoadError(readLoadError());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeLocalReviews(refresh);
  }, [refresh]);

  const diagnosis = diagnoseSlug(slug, [slug], local);
  const loadedSlugs = [
    ...new Set([
      ...Object.keys(importedReviews),
      ...Object.keys(local),
      ...Object.keys(reviewOverrides),
    ]),
  ].filter((s) => s !== slug);
  const suggestion = diagnosis.suggestions[0] ?? closestSlug(slug, loadedSlugs);
  const needsFix = diagnosis.source === "generic" && !!suggestion;

  const applyFix = () => {
    if (!suggestion) return;
    const result = remapSlug(local, suggestion, slug);
    writeLocalReviews(result.reviews);
    refresh();
    setStatus(
      `Se movieron ${result.moved} reseñas de "${suggestion}" a "${slug}"` +
        (result.duplicates ? ` (${result.duplicates} duplicadas ignoradas).` : "."),
    );
  };

  return (
    <section className="mt-10 rounded-lg border border-border bg-muted/30 p-5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-medium">
          Diagnóstico de reseñas · <code className="text-xs">{slug}</code>
        </h3>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw size={14} className="mr-1" /> Actualizar
        </Button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground text-xs">JSON importado</dt>
          <dd className="text-lg font-medium">{diagnosis.counts.file}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Publicadas (navegador)</dt>
          <dd className="text-lg font-medium">{diagnosis.counts.local}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Fijas en código</dt>
          <dd className="text-lg font-medium">{diagnosis.counts.overrides}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Duplicadas descartadas</dt>
          <dd className="text-lg font-medium">{diagnosis.duplicatesDropped}</dd>
        </div>
      </dl>

      <p className="mt-4 text-muted-foreground">
        Se muestran:{" "}
        <strong className="text-foreground">
          {diagnosis.source === "generic"
            ? "reseñas genéricas de ejemplo"
            : diagnosis.source === "file"
              ? "reseñas del archivo reviews-1688.json"
              : diagnosis.source === "local"
                ? "reseñas publicadas en este navegador"
                : "reseñas fijas del código"}
        </strong>
      </p>

      {loadError && (
        <p className="mt-3 flex items-start gap-2 text-destructive">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {loadError}
        </p>
      )}

      {diagnosis.problem && (
        <p className="mt-3 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <span>
            {diagnosis.problem}
            {diagnosis.hint && (
              <span className="block text-muted-foreground">{diagnosis.hint}</span>
            )}
          </span>
        </p>
      )}

      {!diagnosis.problem && !loadError && (
        <p className="mt-3 flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 size={16} /> Sin errores de carga para este producto.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={applyFix} disabled={!needsFix}>
          <Wand2 size={14} className="mr-1" />
          {needsFix
            ? `Corregir mapeo automáticamente (${suggestion})`
            : "No hace falta corregir el mapeo"}
        </Button>
        <a
          href="/admin/diagnostico"
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          Abrir diagnóstico completo
        </a>
      </div>

      {status && <p className="mt-3 text-xs text-muted-foreground">{status}</p>}
    </section>
  );
}

export default ReviewDiagnostics;
