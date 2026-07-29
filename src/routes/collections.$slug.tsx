import { createFileRoute } from "@tanstack/react-router";
import { fetchCatalog } from "@/lib/data/catalog.functions";
import Collection from "@/components/pages/Collection";

export const Route = createFileRoute("/collections/$slug")({
  loader: () => fetchCatalog(),
  staleTime: 5 * 60 * 1000,
  component: CollectionRoute,
});

function CollectionRoute() {
  const catalog = Route.useLoaderData();
  return <Collection catalog={catalog} />;
}
