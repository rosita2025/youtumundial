import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Aviso legal (disclaimer) — Ropa de Youtumundial" },
      {
        name: "description",
        content:
          "Aviso legal de Youtumundial sobre colores, tallas, disponibilidad, plazos e información publicada en el sitio.",
      },
      { property: "og:title", content: "Aviso legal — Ropa de Youtumundial" },
      {
        property: "og:description",
        content: "Alcance y límites de la información publicada en la tienda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <StaticPage
      title="Aviso legal"
      intro="Alcance y límites de la información publicada en esta tienda."
      updatedAt="26 de julio de 2026"
    >
      <Section heading="Información general">
        <p>
          El contenido de este sitio tiene fines informativos y comerciales. Hacemos lo posible por
          mantener descripciones, precios y disponibilidad actualizados, pero pueden existir errores
          tipográficos o desactualizaciones puntuales que corregimos apenas los detectamos.
        </p>
      </Section>

      <Section heading="Colores y fotografías">
        <p>
          Las fotos son referenciales. El color real de una prenda puede variar levemente según la
          iluminación de la foto y la calibración de tu pantalla. Estas diferencias menores no se
          consideran un defecto del producto.
        </p>
      </Section>

      <Section heading="Tallas y medidas">
        <p>
          Las tallas siguen la guía publicada en cada producto y pueden presentar variaciones de
          hasta 2 cm por tratarse de confección textil. Ante la duda, consultanos antes de comprar.
        </p>
      </Section>

      <Section heading="Disponibilidad y plazos">
        <p>
          La disponibilidad mostrada es referencial y depende del stock de nuestros proveedores. Los
          plazos de entrega son estimados y no constituyen una garantía contractual: pueden verse
          afectados por aduanas, transportistas o situaciones de fuerza mayor.
        </p>
      </Section>

      <Section heading="Enlaces externos">
        <p>
          El sitio puede contener enlaces a plataformas de terceros (pagos, transportistas, redes
          sociales). No controlamos ni respondemos por el contenido, las políticas ni las prácticas
          de esos sitios.
        </p>
      </Section>

      <Section heading="Marcas de terceros">
        <p>
          Cualquier marca, logo o nombre comercial de terceros mencionado en el sitio pertenece a
          sus respectivos titulares y se usa únicamente con fines descriptivos o identificatorios.
        </p>
      </Section>

      <Section heading="Uso de los productos">
        <p>
          No nos responsabilizamos por daños derivados del uso inadecuado de las prendas o del
          incumplimiento de las instrucciones de lavado y cuidado indicadas en la etiqueta.
        </p>
      </Section>
    </StaticPage>
  );
}
