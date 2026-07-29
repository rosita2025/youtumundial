import { createFileRoute } from "@tanstack/react-router";
import { fetchCatalog } from "@/lib/data/catalog.functions";
import Collection from "@/components/pages/Collection";

export const Route = createFileRoute("/collections/$slug")({
  loader: () => fetchCatalog(),
  component: CollectionRoute,
});

function CollectionRoute() {
  const catalog = Route.useLoaderData();
  return <Collection catalog={catalog} />;
}
