import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";
import { checkoutConfig } from "@/lib/checkout/config";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Clock } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contacto — Ropa de Youtumundial" },
      {
        name: "description",
        content:
          "Escribinos por WhatsApp o email para consultas sobre pedidos, tallas, pagos y envíos de Youtumundial.",
      },
      { property: "og:title", content: "Contacto — Ropa de Youtumundial" },
      {
        property: "og:description",
        content: "Consultas sobre pedidos, tallas, pagos y envíos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const wa = `https://wa.me/${checkoutConfig.whatsapp}`;

  return (
    <StaticPage
      title="Contacto"
      intro="¿Dudas con una talla, un pedido o un pago? Estamos del otro lado."
    >
      <Section heading="Canales de atención">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-5">
            <MessageCircle className="mb-3 text-foreground" size={22} />
            <h3 className="font-medium text-foreground">WhatsApp</h3>
            <p className="text-sm mt-1">La vía más rápida para consultas y seguimiento.</p>
            <Button asChild className="mt-4">
              <a href={wa} target="_blank" rel="noopener noreferrer">
                Escribir por WhatsApp
              </a>
            </Button>
          </div>
          <div className="rounded-lg border border-border p-5">
            <Mail className="mb-3 text-foreground" size={22} />
            <h3 className="font-medium text-foreground">Email</h3>
            <p className="text-sm mt-1">Para reclamos, facturación y devoluciones.</p>
            <Button asChild variant="outline" className="mt-4">
              <a href="mailto:hola@youtumundial.com">hola@youtumundial.com</a>
            </Button>
          </div>
        </div>
      </Section>

      <Section heading="Horario de atención">
        <p className="flex items-center gap-2">
          <Clock size={18} /> Lunes a sábado, 9:00 a 20:00 (hora de Perú, GMT-5).
        </p>
        <p>Respondemos los mensajes en un plazo máximo de 24 horas hábiles.</p>
      </Section>

      <Section heading="Antes de escribir">
        <p>
          Si tu consulta es sobre el estado de un pedido, tené a mano el número de orden y el
          correo con el que comprás: así lo resolvemos en un solo mensaje.
        </p>
      </Section>
    </StaticPage>
  );
}
