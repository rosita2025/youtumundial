import { createFileRoute } from "@tanstack/react-router";
import { fetchCatalog } from "@/lib/data/catalog.functions";
import Search from "@/components/pages/Search";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Buscar productos — Ropa de Youtumundial" },
      { name: "description", content: "Busca entre toda la ropa de Youtumundial." },
    ],
  }),
  loader: () => fetchCatalog(),
  staleTime: 5 * 60 * 1000,
  component: SearchRoute,
});

function SearchRoute() {
  const catalog = Route.useLoaderData();
  return <Search catalog={catalog} />;
}
