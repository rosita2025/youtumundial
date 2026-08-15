import { reviewFingerprint, isNearDuplicate } from "./fingerprint";
// Reseñas importadas (estilo 1688 / proveedor), traducidas al español.
//
// DOS FORMAS DE CARGARLAS:
// A) AUTOMÁTICA — exportás/copiás las reseñas de 1688 a un JSON o CSV y corrés:
//      node scripts/import-1688-reviews.mjs data/1688-reviews.csv
//    Eso escribe src/lib/reviews/reviews-1688.json y la tienda las toma sola.
// B) MANUAL — editás directamente reviews-1688.json (clave = slug del producto)
//    o agregás una entrada en `reviewOverrides` de abajo.
//
// Si un producto no tiene reseñas propias, se le asignan reseñas del pool
// genérico (siempre las mismas para el mismo producto).

import imported from "./reviews-1688.json";

export interface Review {
  author: string;
  country: string; // código ISO: PE, US, CA, GB
  rating: number; // 1 a 5
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
  size?: string;
  verified?: boolean;
  photos?: string[];
  /** false = oculta en la tienda (borrador del panel). Por defecto se publica. */
  published?: boolean;
}

export const countryFlags: Record<string, string> = {
  PE: "🇵🇪",
  US: "🇺🇸",
  CA: "🇨🇦",
  GB: "🇬🇧",
  CN: "🇨🇳",
  ES: "🇪🇸",
  MX: "🇲🇽",
  CL: "🇨🇱",
  AR: "🇦🇷",
};

/** Reseñas importadas desde 1688 / SUP (generadas por el script o a mano). */
export const importedReviews = (imported as { reviews?: Record<string, Review[]> }).reviews ?? {};

/** Reseñas específicas por producto escritas a mano (tienen prioridad). */
export const reviewOverrides: Record<string, Review[]> = {};


/** Pool genérico usado cuando el producto todavía no tiene reseñas propias. */
const reviewPool: Review[] = [
  {
    author: "Carlos M.",
    country: "PE",
    rating: 5,
    date: "2026-06-18",
    title: "Fabric better than expected",
    body: "Arrived in 9 days to Lima. The fabric is thick, not transparent, and the stitching is well-finished. I ordered my usual size and it fits perfectly.",
    size: "M",
    verified: true,
  },
  {
    author: "Ana L.",
    country: "PE",
    rating: 5,
    date: "2026-06-02",
    title: "Just like the photos",
    body: "The color is identical to the website, maybe one shade darker in natural light. I already ordered another one in a different color.",
    size: "S",
    verified: true,
  },
  {
    author: "Jason W.",
    country: "US",
    rating: 4,
    date: "2026-05-27",
    title: "Good quality, fits snug",
    body: "The quality for the price is very good. Fits a bit snug in the shoulders, if in doubt order one size up.",
    size: "L",
    verified: true,
  },
  {
    author: "María F.",
    country: "PE",
    rating: 5,
    date: "2026-05-15",
    title: "Held up through several washes",
    body: "I washed it four times in the machine with cold water and it didn't lose its shape or color. Recommended.",
    size: "M",
    verified: true,
  },
  {
    author: "Sophie R.",
    country: "CA",
    rating: 5,
    date: "2026-05-04",
    title: "Worth every penny",
    body: "Arrived well-packaged and wrinkle-free. The interior finish is better than other more expensive garments I've bought.",
    size: "M",
    verified: true,
  },
  {
    author: "Diego S.",
    country: "PE",
    rating: 4,
    date: "2026-04-22",
    title: "All good, arrived a bit late",
    body: "Excellent product, delivery took two days longer than estimated. Still, I would buy it again.",
    size: "XL",
    verified: true,
  },
  {
    author: "Emily T.",
    country: "GB",
    rating: 5,
    date: "2026-04-10",
    title: "Comfortable for everyday use",
    body: "Super comfy, I wear it almost daily. The cut is modern without being over the top.",
    size: "S",
    verified: true,
  },
  {
    author: "Luis R.",
    country: "PE",
    rating: 5,
    date: "2026-03-29",
    title: "Top-notch customer service",
    body: "I asked about the size before buying and they responded immediately. What I ordered arrived, no surprises.",
    size: "L",
    verified: true,
  },
  {
    author: "Valeria C.",
    country: "PE",
    rating: 4,
    date: "2026-03-12",
    title: "Very good, watch the sizing",
    body: "The garment is good quality but comes with an Asian fit, a bit smaller. I ordered a size up and it fit well.",
    size: "M",
    verified: true,
  },
  {
    author: "Michael B.",
    country: "US",
    rating: 5,
    date: "2026-02-26",
    title: "Repeat purchase",
    body: "Second purchase from this store. Same quality as the first time and the shipping arrived ahead of schedule.",
    size: "XL",
    verified: true,
  },
  {
    author: "Kevin H.",
    country: "US",
    rating: 5,
    date: "2026-08-10",
    title: "Fast shipping to CA",
    body: "The quality is top-notch. I was skeptical but the material is heavy and the print is high resolution. Definitely worth it.",
    size: "L",
    verified: true,
  },
  {
    author: "Marta G.",
    country: "ES",
    rating: 5,
    date: "2026-08-05",
    title: "Very satisfied with the purchase",
    body: "Arrived in Madrid in just over a week. The size matches the guide perfectly. The fabric is very soft to the touch.",
    size: "M",
    verified: true,
  },
  {
    author: "John D.",
    country: "GB",
    rating: 5,
    date: "2026-07-28",
    title: "Great customer service",
    body: "Had a question about shipping and they replied within minutes. The product arrived safely and looks even better than the pictures.",
    size: "XL",
    verified: true,
  },
  {
    author: "Sarah L.",
    country: "US",
    rating: 5,
    date: "2026-08-12",
    title: "Amazing quality for the price",
    body: "I was surprised by how good the material feels. It's thick and durable. Definitely not like other cheap dropshipping sites.",
    size: "S",
    verified: true,
  },
  {
    author: "David K.",
    country: "CA",
    rating: 4,
    date: "2026-08-08",
    title: "Cool design, runs a bit small",
    body: "Love the design and the print quality is great. Just be aware that it runs a bit small, so size up if you want a loose fit.",
    size: "XL",
    verified: true,
  }
];

/** Hash estable a partir del slug para asignar siempre las mismas reseñas. */
function hash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

export function getProductReviews(
  slug: string,
  extra?: Record<string, Review[]>
): Review[] {
  // 1) reseñas escritas a mano, 2) publicadas desde el panel, 3) importadas
  //    de 1688, 4) pool genérico
  const merged: Review[] = [];
  const seen = new Set<string>();
  for (const list of [reviewOverrides[slug], extra?.[slug], importedReviews[slug]]) {
    for (const r of list ?? []) {
      if (r.published === false) continue;
      // Anti-duplicados estricto: hash del contenido + similitud de texto.
      const key = reviewFingerprint(r);
      if (seen.has(key) || isNearDuplicate(r, merged)) continue;
      seen.add(key);
      merged.push(r);
    }
  }
  if (merged.length) return merged.sort((a, b) => b.date.localeCompare(a.date));



  const h = hash(slug);
  const count = 3 + (h % 4); // entre 3 y 6 reseñas
  const start = h % reviewPool.length;
  const picked: Review[] = [];
  for (let i = 0; i < count; i++) picked.push(reviewPool[(start + i) % reviewPool.length]);
  return picked.sort((a, b) => b.date.localeCompare(a.date));
}

export function getReviewSummary(slug: string, extra?: Record<string, Review[]>) {
  const reviews = getProductReviews(slug, extra);
  const total = reviews.length;
  const average = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  return { reviews, total, average, distribution };
}
