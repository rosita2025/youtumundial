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
    title: "Tela mejor de lo que esperaba",
    body: "Llegó en 9 días a Lima. La tela es gruesa, no transparenta y la costura está bien rematada. Pedí mi talla habitual y quedó perfecto.",
    size: "M",
    verified: true,
  },
  {
    author: "Ana L.",
    country: "PE",
    rating: 5,
    date: "2026-06-02",
    title: "Igual a las fotos",
    body: "El color es idéntico al de la página, quizá un tono más oscuro con luz natural. Ya pedí otro en otro color.",
    size: "S",
    verified: true,
  },
  {
    author: "Jason W.",
    country: "US",
    rating: 4,
    date: "2026-05-27",
    title: "Buena calidad, calza justo",
    body: "La calidad por el precio es muy buena. Calza un poco justo de hombros, si dudás pedí una talla más.",
    size: "L",
    verified: true,
  },
  {
    author: "María F.",
    country: "PE",
    rating: 5,
    date: "2026-05-15",
    title: "Aguantó varios lavados",
    body: "Lo lavé cuatro veces en lavadora con agua fría y no se deformó ni destiñó. Recomendado.",
    size: "M",
    verified: true,
  },
  {
    author: "Sophie R.",
    country: "CA",
    rating: 5,
    date: "2026-05-04",
    title: "Vale lo que cuesta",
    body: "Llegó bien empacado y sin arrugas. El acabado interior está mejor terminado que otras prendas que compré más caras.",
    size: "M",
    verified: true,
  },
  {
    author: "Diego S.",
    country: "PE",
    rating: 4,
    date: "2026-04-22",
    title: "Todo bien, demoró un poco",
    body: "El producto excelente, la entrega tardó dos días más de lo estimado. Igual lo volvería a comprar.",
    size: "XL",
    verified: true,
  },
  {
    author: "Emily T.",
    country: "GB",
    rating: 5,
    date: "2026-04-10",
    title: "Cómodo para todos los días",
    body: "Súper cómodo, lo uso casi a diario. El corte es moderno sin ser exagerado.",
    size: "S",
    verified: true,
  },
  {
    author: "Luis R.",
    country: "PE",
    rating: 5,
    date: "2026-03-29",
    title: "Atención por WhatsApp de 10",
    body: "Consulté la talla antes de comprar y me respondieron al toque. Llegó lo que pedí, sin sorpresas.",
    size: "L",
    verified: true,
  },
  {
    author: "Valeria C.",
    country: "PE",
    rating: 4,
    date: "2026-03-12",
    title: "Muy bueno, ojo con la talla",
    body: "La prenda es de buena calidad pero viene con calce asiático, un poco más chico. Pedí una talla arriba y quedó bien.",
    size: "M",
    verified: true,
  },
  {
    author: "Michael B.",
    country: "US",
    rating: 5,
    date: "2026-02-26",
    title: "Repito compra",
    body: "Segunda compra en la tienda. Misma calidad que la primera vez y el envío llegó antes de lo previsto.",
    size: "XL",
    verified: true,
  },
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
  const custom = reviewOverrides[slug] ?? extra?.[slug] ?? importedReviews[slug];
  if (custom?.length) return [...custom].sort((a, b) => b.date.localeCompare(a.date));



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
