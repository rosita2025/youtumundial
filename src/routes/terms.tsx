import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";
import { Link } from "@/lib/router-compat";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Términos y condiciones — Ropa de Youtumundial" },
      {
        name: "description",
        content:
          "Condiciones de compra, pagos, precios y garantías de la tienda online Ropa de Youtumundial.",
      },
      { property: "og:title", content: "Términos y condiciones — Ropa de Youtumundial" },
      {
        property: "og:description",
        content: "Condiciones de compra, pagos, precios y garantías.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <StaticPage
      title="Términos y condiciones"
      intro="Al realizar una compra en esta tienda aceptás las condiciones que se detallan a continuación."
      updatedAt="26 de julio de 2026"
    >
      <Section heading="1. La tienda">
        <p>
          Ropa de Youtumundial es una tienda online que comercializa prendas de vestir y accesorios
          a través del sitio youtumundial.com.
        </p>
      </Section>

      <Section heading="2. Precios y moneda">
        <p>
          Todos los precios se muestran en dólares estadounidenses (USD) e incluyen el valor del
          producto. El costo de envío se calcula según el país de destino y se muestra antes de
          confirmar el pago. Los precios pueden cambiar sin previo aviso, pero nunca después de
          confirmada una compra.
        </p>
      </Section>

      <Section heading="3. Pedidos y confirmación">
        <p>
          Un pedido se considera confirmado cuando el pago fue aprobado. Nos reservamos el derecho
          de cancelar y reembolsar un pedido si el producto quedó sin stock, si detectamos un error
          evidente en el precio publicado o si hay sospecha de fraude.
        </p>
      </Section>

      <Section heading="4. Medios de pago">
        <p>
          Aceptamos tarjetas de crédito y débito a través de Stripe, además de otros medios
          habilitados en el checkout como PayPal, Yape y Plin. El pago con tarjeta se procesa en un
          entorno seguro externo; nosotros no almacenamos los datos de tu tarjeta.
        </p>
      </Section>

      <Section heading="5. Envíos">
        <p>
          Los costos y plazos de entrega se detallan en{" "}
          <Link to="/shipping" className="text-foreground underline underline-offset-4">
            Envíos y devoluciones
          </Link>
          . Los plazos son estimados y pueden verse afectados por aduanas, feriados o demoras del
          transportista.
        </p>
      </Section>

      <Section heading="6. Cambios y devoluciones">
        <p>
          Se rigen por lo indicado en la página de envíos y devoluciones, que forma parte de estos
          términos.
        </p>
      </Section>

      <Section heading="7. Uso del sitio">
        <p>
          Está prohibido usar el sitio con fines fraudulentos, intentar vulnerar su seguridad o
          reproducir sus contenidos, imágenes y textos sin autorización escrita.
        </p>
      </Section>

      <Section heading="8. Propiedad intelectual">
        <p>
          La marca, el logotipo, los textos y el diseño del sitio pertenecen a Youtumundial. Las
          imágenes de producto pueden pertenecer a sus respectivos fabricantes o proveedores.
        </p>
      </Section>

      <Section heading="9. Responsabilidad">
        <p>
          Nuestra responsabilidad máxima frente a cualquier reclamo se limita al importe abonado por
          el pedido en cuestión.
        </p>
      </Section>

      <Section heading="10. Modificaciones">
        <p>
          Podemos actualizar estos términos en cualquier momento. La versión vigente es siempre la
          publicada en esta página, con su fecha de actualización.
        </p>
      </Section>
    </StaticPage>
  );
}
