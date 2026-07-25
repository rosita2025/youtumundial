import { createFileRoute } from "@tanstack/react-router";
import Search from "@/components/pages/Search";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Buscar productos — Ropa de Youtumundial" },
      { name: "description", content: "Busca entre toda la ropa de Youtumundial." },
    ],
  }),
  component: Search,
});
