import { createFileRoute } from "@tanstack/react-router";
import { fetchCatalog } from "@/lib/data/catalog.functions";
import ProductDetail from "@/components/pages/ProductDetail";

const SITE = "https://youtumundial.com";

export const Route = createFileRoute("/products/$slug")({
  loader: () => fetchCatalog(),
  staleTime: 5 * 60 * 1000,
  head: ({ params, loaderData }) => {
    const product = loaderData?.find((p) => p.slug === params.slug);
    const url = `${SITE}/products/${params.slug}`;

    if (!product) {
      return {
        meta: [
          { title: "Producto no disponible — Ropa de Youtumundial" },
          { name: "robots", content: "noindex" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }

    const title = `${product.title} — Ropa de Youtumundial`;
    const description = (
      product.description || `${product.title} disponible en Youtumundial.`
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 155);
    const image = product.images?.[0]?.url;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description,
            image: product.images?.map((i) => i.url) ?? [],
            sku: product.variants?.[0]?.sku || product.slug,
            ...(product.vendor
              ? { brand: { "@type": "Brand", name: product.vendor } }
              : {}),
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "USD",
              price: String(product.price),
              availability: product.variants?.some((v) => v.available)
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
          }),
        },
      ],
    };
  },
  component: ProductDetailRoute,
});

function ProductDetailRoute() {
  const catalog = Route.useLoaderData();
  return <ProductDetail catalog={catalog} />;
}
