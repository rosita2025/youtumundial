/**
 * Parser del texto copiado del panel "View reviews" de 1688.
 *
 * 1688 carga las reseñas dentro de un modal con JavaScript, así que muchas veces
 * el scraper no las ve. La vía 100% fiel es abrir el modal en el navegador,
 * seleccionar todo el texto (Ctrl+A / Ctrl+C dentro del panel) y pegarlo acá:
 * lo que se importa es exactamente lo que dice 1688, sin inventar nada.
 */

export interface PastedReviewRow {
  slug: string;
  author: string;
  country: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  size?: string;
}

const DATE_LINE =
  /^\s*(?:(\d+)\s*(days?|day|hours?|months?|years?|天前|天|个月前|小时前)\s*ago?|(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2}))/i;

const NOISE = [
  /^all\b/i,
  /^good reviews/i,
  /^there is content/i,
  /^positive feedback/i,
  /^view reviews/i,
  /^\d+(\.\d+)?\s*\(\d+/,
  /^\d+$/,
  /^[<>‹›]$/,
];

const PURCHASE_LINE = /^already purchased|^已购买|^购买/i;
const BADGES = /\b(PLUS|专业买家|回头客|Shanghai|Beijing|Guangdong|Zhejiang|Jiangsu|Fujian|Shandong)\b/g;

function cleanAuthor(line: string): string {
  const cleaned = line.replace(BADGES, "").replace(/\s{2,}/g, " ").trim();
  if (!cleaned) return "Usuario anónimo";
  if (/^purchase anonymously$/i.test(cleaned) || /^匿名/.test(cleaned)) return "Usuario anónimo";
  return cleaned.slice(0, 40);
}

function relativeToDate(amount: number, unit: string): string {
  const now = new Date();
  const u = unit.toLowerCase();
  let days = amount;
  if (u.startsWith("hour") || u.includes("小时")) days = 0;
  else if (u.startsWith("month") || u.includes("个月")) days = amount * 30;
  else if (u.startsWith("year")) days = amount * 365;
  now.setDate(now.getDate() - days);
  return now.toISOString().slice(0, 10);
}

function parseSize(line: string): string {
  const match = line.match(/size\/?\s*([a-z0-9]+)/i) || line.match(/尺码[:：]?\s*([^\s/]+)/);
  return match ? match[1].toUpperCase() : "";
}

function parseRating(lines: string[]): number {
  for (const line of lines) {
    const stars = (line.match(/★/g) || []).length;
    if (stars >= 1 && stars <= 5) return stars;
    const num = line.match(/^\s*([1-5])(?:\.0)?\s*(?:stars?|estrellas?|星)/i);
    if (num) return Number(num[1]);
  }
  return 5;
}

/** Convierte el texto pegado del modal de 1688 en filas de reseñas. */
export function parsePasted1688Reviews(text: string, slug: string): PastedReviewRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !NOISE.some((re) => re.test(l)));

  const rows: PastedReviewRow[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(DATE_LINE);
    if (!match) continue;

    const date = match[3]
      ? `${match[3]}-${match[4].padStart(2, "0")}-${match[5].padStart(2, "0")}`
      : relativeToDate(Number(match[1]), match[2]);

    // Autor: la última línea no vacía antes de la fecha que no sea otro comentario.
    const author = cleanAuthor(lines[i - 1] ?? "");

    // Cuerpo: líneas siguientes hasta la próxima fecha o el próximo autor.
    const bodyParts: string[] = [];
    let size = "";
    let j = i + 1;
    for (; j < lines.length; j++) {
      if (DATE_LINE.test(lines[j])) break;
      if (PURCHASE_LINE.test(lines[j])) {
        size = size || parseSize(lines[j]);
        continue;
      }
      if ((lines[j].match(/★/g) || []).length > 0) continue;
      bodyParts.push(lines[j]);
    }

    // La última línea del bloque suele ser el autor de la próxima reseña.
    if (j < lines.length && bodyParts.length > 1) bodyParts.pop();

    const body = bodyParts.join(" ").replace(/\s{2,}/g, " ").trim();
    if (!body || body.length < 4) continue;

    const key = `${author.toLowerCase()}|${body.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      slug,
      author,
      country: "CN",
      rating: parseRating([lines[i], lines[i - 1] ?? ""]),
      date,
      title: body.slice(0, 40),
      body,
      ...(size ? { size } : {}),
    });
  }

  return rows;
}
