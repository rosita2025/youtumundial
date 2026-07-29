import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";
import { Link } from "@/lib/router-compat";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Términos y condiciones — Youtumundial" },
      {
        name: "description",
        content:
          "Condiciones de compra, pagos, envíos, marcas y responsabilidad de Youtumundial.",
      },
      { property: "og:title", content: "Términos y condiciones — Youtumundial" },
      {
        property: "og:description",
        content: "Condiciones de compra, pagos, envíos, marcas y responsabilidad.",
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
      intro="Al realizar una compra en Youtumundial aceptás las condiciones que se detallan a continuación. Esta página es mantenida por Youtumundial para responder preguntas frecuentes sobre nuestra tienda online."
      updatedAt="29 de julio de 2026"
    >
      <Section heading="1. La tienda">
        <p>
          Youtumundial es una tienda online independiente que comercializa ropa deportiva y moda
          de mujer de múltiples marcas. Operamos a través de youtumundial.com y enviamos a
          clientes de todo el mundo.
        </p>
      </Section>

      <Section heading="2. Naturaleza multi-marca y origen de los productos">
        <p>
          Nuestro catálogo incluye productos inspirados en estilos de China, Corea del Sur,
          Estados Unidos y Europa. Todas las prendas son fabricadas en China e importadas a través
          de proveedores de Taobao y socios logísticos. La disponibilidad de marcas es opcional y
          rotativa; cada ficha de producto indica la marca (vendor), el tipo de producto y las
          colecciones a las que pertenece.
        </p>
        <p>
          Youtumundial no es el fabricante ni distribuidor oficial, licenciatario, agente o
          afiliado de las marcas europeas, americanas, coreanas o chinas que aparecen en la tienda.
          Los nombres, logotipos y marcas registradas pertenecen a sus respectivos dueños y se usan
          únicamente para describir los productos que nos suministran. No nos responsabilizamos por
          reclamos de terceros sobre propiedad intelectual más allá de nuestro control como
          importador minorista. Si tenés una inquietud sobre un producto, contactanos y lo
          revisaremos.
        </p>
      </Section>

      <Section heading="3. Precios y moneda">
        <p>
          Todos los precios se muestran en dólares estadounidenses (USD) e incluyen el valor del
          producto. El costo de envío se calcula según el país de destino y se muestra antes de
          confirmar el pago. Los precios pueden cambiar sin previo aviso, pero nunca después de
          confirmada una compra.
        </p>
      </Section>

      <Section heading="4. Pedidos y confirmación">
        <p>
          Un pedido se considera confirmado cuando el pago fue aprobado. Nos reservamos el derecho
          de cancelar y reembolsar un pedido si el producto quedó sin stock, si detectamos un error
          evidente en el precio publicado o si hay sospecha de fraude.
        </p>
      </Section>

      <Section heading="5. Medios de pago">
        <p>
          Los pagos se procesan a través de Stripe. Aceptamos tarjetas de crédito y débito, Link,
          Google Pay, Apple Pay y otros medios habilitados por Stripe según tu país y navegador. El
          pago se procesa en un entorno seguro externo; nosotros no almacenamos los datos de tu
          tarjeta.
        </p>
      </Section>

      <Section heading="6. Envíos">
        <p>
          Los costos y plazos de entrega se detallan en{" "}
          <Link to="/shipping" className="text-foreground underline underline-offset-4">
            Envíos y devoluciones
          </Link>
          . Los plazos son estimados y pueden verse afectados por aduanas, feriados o demoras del
          transportista. Trabajamos con proveedores de dropshipping y logística internacional para
          preparar y despachar los paquetes.
        </p>
      </Section>

      <Section heading="7. Cambios y devoluciones">
        <p>
          Se rigen por lo indicado en la página de envíos y devoluciones, que forma parte de estos
          términos.
        </p>
      </Section>

      <Section heading="8. Uso del sitio">
        <p>
          Está prohibido usar el sitio con fines fraudulentos, intentar vulnerar su seguridad o
          reproducir sus contenidos, imágenes y textos sin autorización escrita.
        </p>
      </Section>

      <Section heading="9. Propiedad intelectual">
        <p>
          La marca Youtumundial, el logotipo, los textos propios y el diseño del sitio pertenecen a
          Youtumundial. Las imágenes de producto, nombres de marca y referencias de terceros pueden
          pertenecer a sus respectivos fabricantes o proveedores.
        </p>
      </Section>

      <Section heading="10. Responsabilidad">
        <p>
          Nuestra responsabilidad máxima frente a cualquier reclamo se limita al importe abonado por
          el pedido en cuestión. No garantizamos la disponibilidad continua del sitio ni nos
          responsabilizamos por demoras originadas en aduanas, transportistas o proveedores
          internacionales.
        </p>
      </Section>

      <Section heading="11. Modificaciones">
        <p>
          Podemos actualizar estos términos en cualquier momento. La versión vigente es siempre la
          publicada en esta página, con su fecha de actualización.
        </p>
      </Section>
    </StaticPage>
  );
}
