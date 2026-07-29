import { createFileRoute } from "@tanstack/react-router";
import { fetchCatalog } from "@/lib/data/catalog.functions";
import { selectCollections } from "@/lib/data/data-provider";
import Collection from "@/components/pages/Collection";

const SITE = "https://youtumundial.com";

export const Route = createFileRoute("/collections/$slug")({
  loader: () => fetchCatalog(),
  staleTime: 5 * 60 * 1000,
  head: ({ params, loaderData }) => {
    const url = `${SITE}/collections/${params.slug}`;
    const collection = loaderData
      ? selectCollections(loaderData).find((c) => c.slug === params.slug)
      : undefined;

    if (!collection) {
      return {
        meta: [
          { title: "Colección no disponible — Ropa de Youtumundial" },
          { name: "robots", content: "noindex" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }

    const title = `${collection.title} — Ropa de Youtumundial`;
    const description = `Descubrí ${collection.productCount} productos de la colección ${collection.title} en Youtumundial, con envío internacional.`;
    const image = collection.image?.url;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
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
            "@type": "CollectionPage",
            name: collection.title,
            description,
            url,
          }),
        },
      ],
    };
  },
  component: CollectionRoute,
});

function CollectionRoute() {
  const catalog = Route.useLoaderData();
  return <Collection catalog={catalog} />;
}
