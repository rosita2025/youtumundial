import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { getProductBySku } from "@/lib/data/data-provider";

export const Route = createFileRoute("/productos/$sku")({
  head: () => ({
    meta: [
      { title: "Buscando producto | Youtumundial" },
      { name: "description", content: "Abrí la ficha del producto de Youtumundial usando su código SKU." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductBySku,
});

/** /productos/:sku → resuelve el SKU de Shopify y abre la ficha del producto. */
function ProductBySku() {
  const { sku } = useParams({ from: "/productos/$sku" });
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    getProductBySku(sku)
      .then((match) => {
        if (!active) return;
        if (match) navigate({ to: "/products/$slug", params: { slug: match.product.slug }, replace: true });
        else setNotFound(true);
      })
      .catch(() => active && setNotFound(true));
    return () => {
      active = false;
    };
  }, [sku, navigate]);

  return (
    <div className="container mx-auto px-4 py-24 text-center">
      {notFound ? (
        <p className="text-muted-foreground">No encontramos ningún producto con el código {sku}.</p>
      ) : (
        <p className="text-muted-foreground">Buscando el producto…</p>
      )}
    </div>
  );
}
