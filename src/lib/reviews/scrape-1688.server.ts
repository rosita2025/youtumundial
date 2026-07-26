/**
 * Lectura de una ficha de producto de 1688 mediante Firecrawl.
 *
 * 1688 no tiene API pública: se lee el HTML renderizado y se pide a Firecrawl
 * que extraiga las reseñas en JSON. Lo que no esté en el HTML público
 * (reseñas detrás de login) no se puede recuperar por esta vía.
 */

export interface ScrapedReviewRow {
  slug: string;
  author: string;
  country: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  size?: string;
  photos?: string[];
}

export interface ScrapeReviewsResult {
  rows: ScrapedReviewRow[];
  productTitle: string;
  sourceUrl: string;
  /** Mensaje explicativo cuando no se encontró ninguna reseña. */
  notice?: string;
}

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    productTitle: { type: "string" },
    reviews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          author: { type: "string" },
          rating: { type: "number" },
          date: { type: "string" },
          body: { type: "string" },
          bodyOriginal: { type: "string" },
          size: { type: "string" },
          photos: { type: "array", items: { type: "string" } },
        },
        required: ["body"],
      },
    },
  },
  required: ["reviews"],
} as const;

const EXTRACTION_PROMPT = [
  "Extrae el título del producto y TODAS las reseñas/comentarios de compradores que aparezcan en la página.",
  "Para cada reseña devuelve: nombre del comprador (author), puntaje de 1 a 5 (rating),",
  "fecha (date, formato YYYY-MM-DD), texto del comentario (body), talla o variante (size)",
  "y URLs de fotos del comprador (photos).",
  "Devuelve además bodyOriginal: el texto EXACTO del comentario tal como aparece en la página, sin traducir ni editar.",
  "Traduce solo el campo body al español neutro, conservando el sentido original.",
  "PROHIBIDO inventar, resumir o completar reseñas: si un dato no está visible, dejalo vacío.",
  "Si la página no muestra reseñas, devuelve una lista vacía.",
].join(" ");

function firecrawlRequest(): { url: string; headers: Record<string, string> } {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error(
      "Falta conectar Firecrawl. Pedile al equipo que active el conector Firecrawl en el proyecto.",
    );
  }

  // Conexiones nuevas usan el gateway de Lovable (clave lovc_...);
  // las viejas son claves directas de Firecrawl (fc-...).
  if (key.startsWith("fc-")) {
    return {
      url: "https://api.firecrawl.dev/v2/scrape",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    };
  }

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY no está configurada.");
  return {
    url: "https://connector-gateway.lovable.dev/firecrawl/v2/scrape",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": key,
    },
  };
}

const normalizeForMatch = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "");

/** Verifica que un fragmento del comentario exista realmente en la página leída. */
function isGrounded(text: string, pageText: string): boolean {
  const normalized = normalizeForMatch(text);
  if (normalized.length < 8) return false;
  const snippet = normalized.slice(0, 40);
  if (pageText.includes(snippet)) return true;
  const words = normalized.split(" ").filter((w) => w.length > 3);
  if (words.length === 0) return false;
  const hits = words.filter((w) => pageText.includes(w)).length;
  return hits / words.length >= 0.8;
}

const normalizeDate = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return new Date().toISOString().slice(0, 10);
};

/** Limpia la cadena de cookies pegada por el usuario (una línea tipo "a=1; b=2"). */
function sanitizeCookie(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/^\s*cookie\s*:\s*/i, "")
    .split(/[\n\r]+/)
    .join("; ")
    .split(";")
    .map((c) => c.trim())
    .filter((c) => /^[^=\s]+=/.test(c))
    .join("; ")
    .slice(0, 8000);
}

export async function scrapeReviewsFrom1688(
  url: string,
  slug: string,
  cookie?: string,
  limit = 20,
): Promise<ScrapeReviewsResult> {
  const cookieHeader = sanitizeCookie(cookie);
  const { url: endpoint, headers } = firecrawlRequest();

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      url,
      onlyMainContent: false,
      waitFor: cookieHeader ? 8000 : 4000,
      // Con las cookies de la sesión del usuario, 1688 sirve las reseñas
      // que normalmente esconde detrás del login.
      ...(cookieHeader ? { headers: { Cookie: cookieHeader } } : {}),
      formats: ["markdown", { type: "json", schema: REVIEW_SCHEMA, prompt: EXTRACTION_PROMPT }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Firecrawl scrape falló [${response.status}]: ${body}`);
    throw new Error(`No se pudo leer la página (${response.status}). ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    markdown?: string;
    json?: { productTitle?: string; reviews?: Record<string, unknown>[] };
    data?: { markdown?: string; json?: { productTitle?: string; reviews?: Record<string, unknown>[] } };
  };
  const extracted = payload.json ?? payload.data?.json ?? {};
  const pageText = normalizeForMatch(payload.markdown ?? payload.data?.markdown ?? "");
  const reviews = Array.isArray(extracted.reviews) ? extracted.reviews : [];

  let discarded = 0;
  const rows: ScrapedReviewRow[] = reviews
    .map((r) => {
      const body = String(r.body ?? "").trim();
      if (!body) return null;

      // Anti-invención: la reseña solo se acepta si su texto original
      // aparece de verdad en el HTML leído. Así no se cuelan reseñas
      // generadas por el modelo que no existen en 1688.
      const original = String(r.bodyOriginal ?? "").trim();
      if (pageText && !isGrounded(original || body, pageText)) {
        discarded += 1;
        return null;
      }
      const rating = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      const photos = Array.isArray(r.photos) ? r.photos.map(String).filter(Boolean) : [];
      const size = String(r.size ?? "").trim();
      const row: ScrapedReviewRow = {
        slug,
        author: String(r.author ?? "").trim() || "Cliente verificado",
        country: "CN",
        rating,
        date: normalizeDate(r.date),
        title: body.slice(0, 40),
        body,
        ...(size ? { size } : {}),
        ...(photos.length ? { photos } : {}),
      };
      return row;
    })
    .filter((r): r is ScrapedReviewRow => r !== null)
    .slice(0, Math.max(1, limit));

  return {
    rows,
    productTitle: String(extracted.productTitle ?? "").trim(),
    sourceUrl: url,
    notice:
      rows.length === 0
        ? cookieHeader
          ? "Ni con tu sesión aparecieron reseñas en el HTML de esa URL: 1688 las carga dentro del panel \"View reviews\" por JavaScript. Copiá el texto de ese panel y pegalo en \"Pegar reseñas copiadas de 1688\"."
          : discarded > 0
          ? "Las reseñas que devolvió el lector no coinciden con el contenido real de la página (1688 las carga dentro de un panel con JavaScript), así que las descarté para no publicar reseñas inventadas. Abrí \"View reviews\" en 1688, copiá el texto del panel y pegalo en \"Pegar reseñas copiadas de 1688\"."
          : "1688 no mostró reseñas en el HTML público de esa URL (normalmente quedan detrás del login). Probá pegando el HTML de la página ya abierta con tu sesión, o usá el export de SUP."
        : discarded > 0
          ? `Se descartaron ${discarded} reseñas que no coincidían con el texto real de la página.`
          : undefined,
  };
}
