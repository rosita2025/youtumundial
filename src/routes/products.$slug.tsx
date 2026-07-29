import { createFileRoute } from "@tanstack/react-router";
import { fetchCatalog } from "@/lib/data/catalog.functions";
import ProductDetail from "@/components/pages/ProductDetail";

export const Route = createFileRoute("/products/$slug")({
  loader: () => fetchCatalog(),
  component: ProductDetailRoute,
});

function ProductDetailRoute() {
  const catalog = Route.useLoaderData();
  return <ProductDetail catalog={catalog} />;
}
