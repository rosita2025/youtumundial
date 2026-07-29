import { createFileRoute } from "@tanstack/react-router";
import { fetchCatalog } from "@/lib/data/catalog.functions";
import Index from "@/components/pages/Index";

const TITLE = "Ropa de Youtumundial — Hoodies, camisetas y joggers";
const DESCRIPTION =
  "Comprá ropa cómoda y de calidad en Youtumundial: hoodies, camisetas, joggers y accesorios con envío a Perú, EE.UU., Canadá y Reino Unido.";
const IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/852589bc-75d0-4a1d-b3da-5f16ecd5dd55/id-preview-40081b99--03dc2b4b-2805-4ec5-823c-7419dedbca7e.lovable.app-1785000378091.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://youtumundial.com/" },
      { property: "og:image", content: IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://youtumundial.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Youtumundial",
          url: "https://youtumundial.com",
          email: "youtumundial@gmail.com",
          description: DESCRIPTION,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Ropa de Youtumundial",
          url: "https://youtumundial.com",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://youtumundial.com/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  loader: () => fetchCatalog(),
  staleTime: 5 * 60 * 1000,
  component: HomeRoute,
});

function HomeRoute() {
  const catalog = Route.useLoaderData();
  return <Index catalog={catalog} />;
}
