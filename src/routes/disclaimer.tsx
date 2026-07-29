import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Aviso legal — Ropa de Youtumundial" },
      {
        name: "description",
        content:
          "Aviso legal de Youtumundial sobre marcas, origen de productos, disponibilidad, plazos e información publicada en el sitio.",
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
      intro="Esta página aclara el alcance y los límites de la información publicada en Youtumundial. Es mantenida por Youtumundial como contenido editable para responder preguntas frecuentes de nuestros clientes."
      updatedAt="29 de julio de 2026"
    >
      <Section heading="1. Información general">
        <p>
          El contenido de este sitio tiene fines informativos y comerciales. Hacemos lo posible por
          mantener descripciones, precios, imágenes y disponibilidad actualizados, pero pueden existir
          errores tipográficos o desactualizaciones puntuales que corregimos apenas los detectamos.
        </p>
      </Section>

      <Section heading="2. Naturaleza multi-marca y origen de los productos">
        <p>
          Youtumundial es una tienda online independiente que comercializa ropa deportiva y moda de
          mujer inspirada en estilos de China, Corea del Sur, Estados Unidos y Europa. Nuestro
          catálogo es multi-marca y rotativo: cada ficha indica la marca (vendor), el tipo de producto
          y las colecciones a las que pertenece.
        </p>
        <p>
          Todas las prendas son fabricadas en China e importadas a través de proveedores de Taobao y
          socios logísticos. Ofrecemos precios competitivos porque trabajamos directamente con
          fabricantes y mayoristas de China, sin intermediarios oficiales de las marcas de diseño.
        </p>
      </Section>

      <Section heading="3. Marcas de terceros">
        <p>
          Youtumundial no es el fabricante, distribuidor oficial, licenciatario, agente ni afiliado de
          las marcas europeas, americanas, coreanas o chinas que aparecen en la tienda. Los nombres,
          logotipos, marcas registradas y referencias de terceros pertenecen a sus respectivos dueños y
          se usan únicamente con fines descriptivos o identificatorios, para ayudar a los clientes a
          reconocer el estilo o inspiración de cada producto.
        </p>
        <p>
          No nos responsabilizamos por reclamos de terceros sobre propiedad intelectual más allá de
          nuestro control como importador minorista. Si tenés una inquietud sobre algún producto,
          escribinos a{" "}
          <a
            href="mailto:youtumundial@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            youtumundial@gmail.com
          </a>{" "}
          y lo revisaremos.
        </p>
      </Section>

      <Section heading="4. Colores y fotografías">
        <p>
          Las fotos son referenciales. El color real de una prenda puede variar levemente según la
          iluminación de la foto, el proveedor que la suministra y la calibración de tu pantalla. Estas
          diferencias menores no se consideran un defecto del producto.
        </p>
      </Section>

      <Section heading="5. Tallas y medidas">
        <p>
          Las tallas siguen la guía publicada en cada producto y pueden presentar variaciones de hasta
          2 cm por tratarse de confección textil. Ante la duda, consultanos antes de comprar.
        </p>
      </Section>

      <Section heading="6. Disponibilidad y plazos">
        <p>
          La disponibilidad mostrada es referencial y depende del stock de nuestros proveedores en
          China. Los plazos de entrega son estimados y no constituyen una garantía contractual: pueden
          verse afectados por aduanas, transportistas, feriados o situaciones de fuerza mayor.
        </p>
      </Section>

      <Section heading="7. Enlaces externos">
        <p>
          El sitio puede contener enlaces a plataformas de terceros (pagos, transportistas, redes
          sociales). No controlamos ni respondemos por el contenido, las políticas ni las prácticas de
          esos sitios.
        </p>
      </Section>

      <Section heading="8. Uso de los productos">
        <p>
          No nos responsabilizamos por daños derivados del uso inadecuado de las prendas o del
          incumplimiento de las instrucciones de lavado y cuidado indicadas en la etiqueta.
        </p>
      </Section>

      <Section heading="9. Contacto">
        <p>
          Para consultas sobre este aviso legal o sobre un producto específico, escribinos a{" "}
          <a
            href="mailto:youtumundial@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            youtumundial@gmail.com
          </a>
          .
        </p>
      </Section>
    </StaticPage>
  );
}
