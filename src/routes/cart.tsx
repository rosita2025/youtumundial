import { createFileRoute } from "@tanstack/react-router";
import Cart from "@/components/pages/Cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Tu carrito — Ropa de Youtumundial" },
      { name: "description", content: "Revisa tu carrito y finaliza tu compra." },
    ],
  }),
  component: Cart,
});
