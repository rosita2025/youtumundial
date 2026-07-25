import { createFileRoute } from "@tanstack/react-router";
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
  component: Products,
});
