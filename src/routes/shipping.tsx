import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";
import { shippingCountries, FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/config";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Envíos y devoluciones — Ropa de Youtumundial" },
      {
        name: "description",
        content:
          "Costos, plazos de entrega y política de cambios y devoluciones de Youtumundial para Perú, EE.UU., Canadá y Reino Unido.",
      },
      { property: "og:title", content: "Envíos y devoluciones — Ropa de Youtumundial" },
      {
        property: "og:description",
        content: "Costos, plazos de entrega y política de cambios y devoluciones.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  return (
    <StaticPage
      title="Envíos y devoluciones"
      intro="Todo lo que necesitás saber antes y después de comprar."
    >
      <Section heading="Costos y plazos">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border border-border rounded-lg">
            <thead className="bg-secondary/50 text-foreground">
              <tr>
                <th className="p-3 font-medium">Destino</th>
                <th className="p-3 font-medium">Costo</th>
                <th className="p-3 font-medium">Plazo estimado</th>
              </tr>
            </thead>
            <tbody>
              {shippingCountries.map((c) => (
                <tr key={c.code} className="border-t border-border">
                  <td className="p-3">
                    {c.flag} {c.name}
                  </td>
                  <td className="p-3">US$ {c.shipping}</td>
                  <td className="p-3">{c.eta} hábiles</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Envío gratis en compras superiores a US$ {FREE_SHIPPING_THRESHOLD}. Los plazos empiezan a
          correr desde la confirmación del pago, no desde la compra.
        </p>
      </Section>

      <Section heading="Seguimiento del pedido">
        <p>
          Cuando el paquete sale del almacén te enviamos por email y WhatsApp el número de
          seguimiento. Puede tardar entre 2 y 5 días en mostrar movimientos: es normal.
        </p>
      </Section>

      <Section heading="Impuestos y aduanas">
        <p>
          Para envíos internacionales, algunos países pueden aplicar aranceles o impuestos de
          importación al momento de la entrega. Esos cargos los define la aduana de destino y
          corren por cuenta del comprador.
        </p>
      </Section>

      <Section heading="Cambios y devoluciones">
        <p>
          Tenés 14 días desde la recepción para solicitar un cambio de talla o la devolución de una
          prenda sin uso, con sus etiquetas originales y en su empaque.
        </p>
        <p>
          Si el producto llegó fallado, dañado o no corresponde a lo pedido, nos hacemos cargo del
          costo de la devolución y reponemos o reembolsamos el 100%. Mandanos fotos dentro de las
          72 horas de recibido.
        </p>
        <p>
          En cambios por preferencia (talla o color), el costo del envío de retorno corre por cuenta
          del comprador. No aceptamos devoluciones de ropa interior ni de artículos en liquidación
          final.
        </p>
      </Section>

      <Section heading="Reembolsos">
        <p>
          Una vez aprobada la devolución, el reembolso se procesa al mismo medio de pago usado en la
          compra y puede tardar entre 5 y 10 días hábiles en verse reflejado.
        </p>
      </Section>
    </StaticPage>
  );
}
