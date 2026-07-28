import { createFileRoute } from "@tanstack/react-router";
import Checkout from "@/components/pages/Checkout";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      { title: "Checkout seguro — Ropa de Youtumundial" },
      {
        name: "description",
        content:
          "Pagá con tarjeta, PayPal, Yape o Plin. Envíos internacionales a Perú, EE.UU., Canadá y Reino Unido.",
      },
      { property: "og:title", content: "Checkout seguro — Ropa de Youtumundial" },
      {
        property: "og:description",
        content: "Tarjeta, PayPal, Yape y Plin con envío internacional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Checkout,
});
