import { createFileRoute } from "@tanstack/react-router";
import { fetchCatalog } from "@/lib/data/catalog.functions";
import Products from "@/components/pages/Products";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Shop All — Ropa de Youtumundial" },
      {
        name: "description",
        content:
          "Explora toda la ropa de Youtumundial: hoodies, camisetas, joggers y accesorios.",
      },
      { property: "og:title", content: "Shop All — Ropa de Youtumundial" },
      {
        property: "og:description",
        content: "Explora toda la ropa de Youtumundial.",
      },
    ],
  }),
  loader: () => fetchCatalog(),
  staleTime: 5 * 60 * 1000,
  component: ProductsRoute,
});

function ProductsRoute() {
  const catalog = Route.useLoaderData();
  return <Products catalog={catalog} />;
}
