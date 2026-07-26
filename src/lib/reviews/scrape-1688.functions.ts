import { createServerFn } from "@tanstack/react-start";

export const scrape1688Reviews = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string; slug: string; cookie?: string }) => {
    const url = String(input?.url ?? "").trim();
    const slug = String(input?.slug ?? "").trim();
    if (!/^https?:\/\/.+/i.test(url)) throw new Error("Pegá una URL válida del producto en 1688.");
    if (url.length > 2000) throw new Error("La URL es demasiado larga.");
    if (!slug) throw new Error("Elegí a qué producto de la tienda pertenecen las reseñas.");
    const cookie = String(input?.cookie ?? "").trim().slice(0, 8000);
    return { url, slug, cookie };
  })
  .handler(async ({ data }) => {
    const { scrapeReviewsFrom1688 } = await import("./scrape-1688.server");
    return scrapeReviewsFrom1688(data.url, data.slug, data.cookie);
  });
