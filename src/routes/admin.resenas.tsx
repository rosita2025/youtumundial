import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Download, Copy, AlertTriangle, CheckCircle2, FileJson, Trash2, Link2, Loader2, Rocket, ClipboardPaste } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  parseReviewsInput,
  mergeReviews,
  serializeReviewsFile,
  type ParseResult,
  type ReviewsBySlug,
} from "@/lib/reviews/import-1688";
import { scrape1688Reviews } from "@/lib/reviews/scrape-1688.functions";
import existingFile from "@/lib/reviews/reviews-1688.json";
import { getProducts } from "@/lib/data/data-provider";
import { parsePasted1688Reviews } from "@/lib/reviews/paste-1688";
import { readLocalReviews, writeLocalReviews, clearLocalReviews } from "@/lib/reviews/local-store";


export const Route = createFileRoute("/admin/resenas")({
  component: AdminReviewsPage,
  head: () => ({
    meta: [
      { title: "Importar reseñas 1688 | Panel Youtumundial" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Panel interno para importar y deduplicar reseñas de 1688 por slug de producto." },
    ],
  }),
});

const existingReviews = ((existingFile as { reviews?: ReviewsBySlug }).reviews ?? {}) as ReviewsBySlug;

const PLANTILLA_CSV = `slug,author,country,rating,date,title,body,size,photos
polo-oversize-algodon-premium,Carlos M.,PE,5,2026-06-18,Excelente tela,"Llegó en 9 días, la tela es gruesa y no transparenta.",M,
polo-oversize-algodon-premium,Ana L.,PE,4,2026-06-02,Igual a las fotos,"El color es idéntico al de la página.",S,`;

function countReviews(map: ReviewsBySlug) {
  return Object.values(map).reduce((sum, list) => sum + (list?.length ?? 0), 0);
}

function AdminReviewsPage() {
  const [rawText, setRawText] = useState("");
  const [filename, setFilename] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogSlugs, setCatalogSlugs] = useState<string[] | null>(null);
  const [url, setUrl] = useState("");
  const [urlSlug, setUrlSlug] = useState("");
  const [scraping, setScraping] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteSlug, setPasteSlug] = useState("");
  const [cookie, setCookie] = useState("");
  const [localReviews, setLocalReviews] = useState<ReviewsBySlug>({});
  const [published, setPublished] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const scrape = useServerFn(scrape1688Reviews);

  useEffect(() => {
    setCookie(sessionStorage.getItem("1688_cookie") ?? "");
    const local = readLocalReviews() as ReviewsBySlug;
    setLocalReviews(local);
    setPublished(countReviews(local));
    getProducts()
      .then((products) => setCatalogSlugs(products.map((p) => p.slug)))
      .catch(() => setCatalogSlugs([]));
  }, []);


  const result = useMemo(() => {
    if (!parsed) return null;
    return mergeReviews({ ...existingReviews, ...localReviews }, parsed.bySlug);
  }, [parsed, localReviews]);

  const unknownSlugs = useMemo(() => {
    if (!parsed || !catalogSlugs) return [];
    return parsed.slugs.filter((s) => !catalogSlugs.includes(s));
  }, [parsed, catalogSlugs]);

  function analyze(text: string, name: string) {
    setError(null);
    if (!text.trim()) {
      setParsed(null);
      return;
    }
    try {
      const res = parseReviewsInput(text, name);
      setParsed(res);
      if (res.slugs.length === 0) {
        setError("No se encontró ninguna reseña válida. Cada fila necesita al menos `slug` y el texto de la reseña.");
      }
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? `No se pudo leer el archivo: ${e.message}` : "No se pudo leer el archivo.");
    }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setFilename(file.name);
    setRawText(text);
    analyze(text, file.name);
  }

  function download() {
    if (!result) return;
    const blob = new Blob([serializeReviewsFile(result.merged)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reviews-1688.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo descargado", { description: "Mandámelo y lo dejo publicado en la tienda." });
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(serializeReviewsFile(result.merged));
    toast.success("JSON copiado al portapapeles");
  }

  function reset() {
    setRawText("");
    setFilename("");
    setParsed(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function importFromUrl() {
    setScraping(true);
    setError(null);
    try {
      const cookieValue = cookie.trim();
      if (cookieValue) sessionStorage.setItem("1688_cookie", cookieValue);
      else sessionStorage.removeItem("1688_cookie");
      const res = await scrape({
        data: { url: url.trim(), slug: urlSlug.trim(), cookie: cookieValue },
      });
      if (res.rows.length === 0) {
        setError(res.notice ?? "No se encontraron reseñas en esa URL.");
        return;
      }
      const text = JSON.stringify(res.rows, null, 2);
      setFilename(`1688-${urlSlug.trim()}.json`);
      setRawText(text);
      analyze(text, "url.json");

      // Publicación automática: al importar desde una URL las reseñas quedan
      // visibles al instante, sin depender de tocar "Publicar en la tienda".
      const parsedNow = parseReviewsInput(text, "url.json");
      const mergedNow = mergeReviews(
        { ...existingReviews, ...(readLocalReviews() as ReviewsBySlug) },
        parsedNow.bySlug,
      );
      writeLocalReviews(mergedNow.merged);
      setLocalReviews(mergedNow.merged);
      setPublished(countReviews(mergedNow.merged));

      toast.success(`${res.rows.length} reseñas leídas y publicadas`, {
        description: `${res.productTitle || url} → /products/${urlSlug.trim()}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer esa URL de 1688.");
    } finally {
      setScraping(false);
    }
  }

  function importFromPaste() {
    setError(null);
    const rows = parsePasted1688Reviews(pasteText, pasteSlug.trim());
    if (rows.length === 0) {
      setError(
        "No pude reconocer reseñas en ese texto. Copiá el contenido del panel \"View reviews\" de 1688 (nombre, fecha y comentario de cada una).",
      );
      return;
    }
    const text = JSON.stringify(rows, null, 2);
    setFilename(`1688-${pasteSlug.trim()}.json`);
    setRawText(text);
    analyze(text, "pegado.json");

    const parsedNow = parseReviewsInput(text, "pegado.json");
    const mergedNow = mergeReviews(
      { ...existingReviews, ...(readLocalReviews() as ReviewsBySlug) },
      parsedNow.bySlug,
    );
    writeLocalReviews(mergedNow.merged);
    setLocalReviews(mergedNow.merged);
    setPublished(countReviews(mergedNow.merged));
    toast.success(`${rows.length} reseñas reales importadas y publicadas`, {
      description: `→ /products/${pasteSlug.trim()}`,
    });
  }

  function publish() {
    if (!result) return;
    writeLocalReviews(result.merged);
    setLocalReviews(result.merged);
    setPublished(countReviews(result.merged));
    toast.success("Reseñas publicadas en la tienda", {
      description: "Ya se ven en las fichas de producto de este navegador. Para dejarlas fijas para todos, mandame el archivo descargado.",
    });
  }

  function unpublish() {
    clearLocalReviews();
    setLocalReviews({});
    setPublished(0);
    toast.success("Se quitaron las reseñas publicadas en este navegador");
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Panel interno</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Importar reseñas de 1688</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Pegá la URL del producto en 1688 y traé las reseñas automáticamente, o subí el CSV/JSON exportado de
          1688 / SUP Dropshipping. Las reseñas se agrupan por{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">slug</code> de producto y se eliminan
          automáticamente las repetidas (mismo autor y mismo texto), tanto dentro del archivo como contra las
          que ya están cargadas.
        </p>
      </header>

      {published > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
          <p>
            <span className="font-medium">{published} reseñas publicadas</span> en la tienda desde este panel
            ({Object.keys(localReviews).length} productos).
          </p>
          <Button variant="ghost" size="sm" onClick={unpublish}>
            <Trash2 className="mr-2 h-4 w-4" />
            Quitar
          </Button>
        </div>
      )}

      <section className="mb-6 rounded-xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <Link2 className="h-4 w-4" />
          Importar desde una URL de 1688
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo trae reseñas: nombre del comprador, comentario (traducido al español), puntaje, fecha y fotos.
          Los productos y envíos siguen viniendo de SUP Dropshipping.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_240px_auto]">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://detail.1688.com/offer/123456789.html"
          />
          <Input
            list="catalogo-slugs"
            value={urlSlug}
            onChange={(e) => setUrlSlug(e.target.value)}
            placeholder="slug del producto"
          />
          <datalist id="catalogo-slugs">
            {(catalogSlugs ?? []).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Button onClick={() => void importFromUrl()} disabled={scraping || !url.trim() || !urlSlug.trim()}>
            {scraping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
            {scraping ? "Leyendo…" : "Traer reseñas"}
          </Button>
        </div>
        <div className="mt-4 rounded-lg border border-dashed p-4">
          <label className="text-sm font-medium">
            Cookies de tu sesión de 1688 <span className="text-muted-foreground">(opcional)</span>
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Con tu login abierto en 1688: F12 → pestaña <strong>Network</strong> → clic en cualquier
            petición a 1688 → <strong>Request Headers</strong> → copiá el valor completo de{" "}
            <code className="rounded bg-muted px-1">cookie</code> y pegalo acá. Se guarda solo en esta
            pestaña del navegador (se borra al cerrarla) y se usa únicamente para leer las reseñas
            autenticadas.
          </p>
          <Textarea
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            rows={3}
            className="mt-3 font-mono text-xs"
            placeholder="cna=...; _tb_token_=...; cookie2=...; login=true"
          />
          {cookie.trim() && (
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{cookie.split(";").filter((c) => c.includes("=")).length} cookies detectadas</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCookie("");
                  sessionStorage.removeItem("1688_cookie");
                  toast.success("Cookies borradas de este navegador");
                }}
              >
                Borrar
              </Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Ojo: 1688 esconde muchas reseñas detrás del login. Si no aparece ninguna, abrí el producto con tu
          sesión, copiá el HTML y pegalo abajo, o usá el export de SUP.
        </p>
      </section>


      <section className="mb-6 rounded-xl border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <ClipboardPaste className="h-4 w-4" />
          Pegar reseñas copiadas de 1688 (fiel al original)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          En 1688 abrí <strong>View reviews</strong>, seleccioná y copiá el texto del panel (nombre, fecha y
          comentario de cada reseña) y pegalo acá. Se importan tal cual aparecen, sin inventar nada.
        </p>
        <Textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={8}
          className="mt-4 font-mono text-xs"
          placeholder={"Purchase anonymously\n35 days ago\nAlready purchased:1Box Color/ivory/size/m\nThe lower circumference is a bit warped..."}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-[240px_auto]">
          <Input
            list="catalogo-slugs"
            value={pasteSlug}
            onChange={(e) => setPasteSlug(e.target.value)}
            placeholder="slug del producto"
          />
          <Button onClick={importFromPaste} disabled={!pasteText.trim() || !pasteSlug.trim()}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Importar y publicar
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.json,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button onClick={() => fileInput.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Subir CSV o JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFilename("plantilla.csv");
              setRawText(PLANTILLA_CSV);
              analyze(PLANTILLA_CSV, "plantilla.csv");
            }}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Cargar plantilla de ejemplo
          </Button>
          {(rawText || parsed) && (
            <Button variant="ghost" onClick={reset}>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          )}
          {filename && <span className="text-sm text-muted-foreground">{filename}</span>}
        </div>

        <div className="mt-5">
          <label htmlFor="pegar" className="mb-2 block text-sm font-medium">
            …o pegá el contenido acá
          </label>
          <Textarea
            id="pegar"
            value={rawText}
            rows={8}
            placeholder={"slug,author,rating,date,title,body,size\npolo-oversize,Ana L.,5,2026-06-02,Muy bueno,Tela gruesa y buen calce,M"}
            className="font-mono text-xs"
            onChange={(e) => {
              setRawText(e.target.value);
              analyze(e.target.value, filename);
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Columnas aceptadas en español, inglés o chino: slug · author/用户 · country · rating/评分 ·
            date/日期 · title · body/评价内容 · size/尺码 · photos/图片 (URLs separadas por <code>|</code>).
          </p>
        </div>
      </section>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p>{error}</p>
        </div>
      )}

      {parsed && result && parsed.slugs.length > 0 && (
        <section className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Filas leídas" value={parsed.rows} />
            <Stat label="Reseñas nuevas" value={result.added} highlight />
            <Stat label="Duplicadas (omitidas)" value={result.duplicates + parsed.duplicatesInFile} />
            <Stat label="Sin slug o texto" value={parsed.skipped} />
          </div>

          {unknownSlugs.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">Estos slugs no coinciden con ningún producto del catálogo:</p>
                <p className="mt-1 font-mono text-xs">{unknownSlugs.join(", ")}</p>
                <p className="mt-1 text-muted-foreground">
                  Igual se guardan; se mostrarán cuando exista un producto con ese slug.
                </p>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Producto (slug)</th>
                  <th className="px-4 py-3 font-medium">En el archivo</th>
                  <th className="px-4 py-3 font-medium">Total tras importar</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slugs.map((slug) => (
                  <tr key={slug} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{slug}</td>
                    <td className="px-4 py-3">{parsed.bySlug[slug].length}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{result.merged[slug]?.length ?? 0}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="font-medium">
                  Resultado: {countReviews(result.merged)} reseñas en {Object.keys(result.merged).length} productos
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Descargá el archivo <code className="rounded bg-muted px-1 py-0.5 text-xs">reviews-1688.json</code>{" "}
                  y reemplazá <code className="rounded bg-muted px-1 py-0.5 text-xs">src/lib/reviews/reviews-1688.json</code>{" "}
                  (o pasámelo y lo subo yo). Ahí quedan publicadas en las fichas de producto.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={publish}>
                    <Rocket className="mr-2 h-4 w-4" />
                    Publicar en la tienda
                  </Button>
                  <Button variant="outline" onClick={download}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar reviews-1688.json
                  </Button>
                  <Button variant="ghost" onClick={copy}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar JSON
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <details className="rounded-xl border bg-card p-6">
            <summary className="cursor-pointer text-sm font-medium">Ver JSON generado</summary>
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
              {serializeReviewsFile(result.merged)}
            </pre>
          </details>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
