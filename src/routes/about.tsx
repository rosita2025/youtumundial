import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";
import { Link } from "@/lib/router-compat";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Sobre nosotros — Ropa de Youtumundial" },
      {
        name: "description",
        content:
          "Conocé la historia de Youtumundial: ropa cómoda y de calidad, con envíos a Perú, Estados Unidos, Canadá y Reino Unido.",
      },
      { property: "og:title", content: "Sobre nosotros — Ropa de Youtumundial" },
      {
        property: "og:description",
        content: "Ropa de calidad con envíos internacionales. Conocé quiénes somos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <StaticPage
      title="Sobre nosotros"
      intro="Youtumundial nació con una idea simple: ropa buena, cómoda y con estilo, al alcance de cualquier persona, esté donde esté."
    >
      <Section heading="Quiénes somos">
        <p>
          Somos una tienda online independiente dedicada a la venta de ropa y accesorios.
          Seleccionamos cada prenda pensando en calidad de tela, calce y durabilidad, para que lo
          que comprás te dure y te guste usarlo.
        </p>
      </Section>

      <Section heading="Cómo trabajamos">
        <p>
          Trabajamos con proveedores y talleres asociados que producen y despachan las prendas.
          Este modelo nos permite ofrecer un catálogo amplio sin inflar precios con costos de
          tienda física, y llegar a varios países desde un mismo lugar.
        </p>
        <p>
          Los plazos de entrega varían según el destino y los detallamos en cada pedido antes de
          pagar. Podés revisarlos en{" "}
          <Link to="/shipping" className="text-foreground underline underline-offset-4">
            Envíos y devoluciones
          </Link>
          .
        </p>
      </Section>

      <Section heading="A dónde enviamos">
        <p>
          Actualmente enviamos a Perú, Estados Unidos, Canadá y Reino Unido. Si tu país no está en
          la lista, escribinos y vemos si podemos gestionarlo.
        </p>
      </Section>

      <Section heading="Hablemos">
        <p>
          Cualquier duda sobre tallas, pedidos o pagos, escribinos desde la página de{" "}
          <Link to="/contact" className="text-foreground underline underline-offset-4">
            contacto
          </Link>
          . Respondemos todos los días.
        </p>
      </Section>
    </StaticPage>
  );
}
