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
  "Traduce el texto del comentario y el nombre del producto al español neutro, conservando el sentido original.",
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

const normalizeDate = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return new Date().toISOString().slice(0, 10);
};

export async function scrapeReviewsFrom1688(
  url: string,
  slug: string,
): Promise<ScrapeReviewsResult> {
  const { url: endpoint, headers } = firecrawlRequest();

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      url,
      onlyMainContent: false,
      waitFor: 4000,
      formats: [{ type: "json", schema: REVIEW_SCHEMA, prompt: EXTRACTION_PROMPT }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Firecrawl scrape falló [${response.status}]: ${body}`);
    throw new Error(`No se pudo leer la página (${response.status}). ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    json?: { productTitle?: string; reviews?: Record<string, unknown>[] };
    data?: { json?: { productTitle?: string; reviews?: Record<string, unknown>[] } };
  };
  const extracted = payload.json ?? payload.data?.json ?? {};
  const reviews = Array.isArray(extracted.reviews) ? extracted.reviews : [];

  const rows: ScrapedReviewRow[] = reviews
    .map((r) => {
      const body = String(r.body ?? "").trim();
      if (!body) return null;
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
    .filter((r): r is ScrapedReviewRow => r !== null);

  return {
    rows,
    productTitle: String(extracted.productTitle ?? "").trim(),
    sourceUrl: url,
    notice:
      rows.length === 0
        ? "1688 no mostró reseñas en el HTML público de esa URL (normalmente quedan detrás del login). Probá pegando el HTML de la página ya abierta con tu sesión, o usá el export de SUP."
        : undefined,
  };
}
