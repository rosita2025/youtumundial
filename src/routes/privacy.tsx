import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de privacidad — Youtumundial" },
      {
        name: "description",
        content:
          "Cómo Youtumundial recolecta, usa y protege tus datos personales al comprar en la tienda.",
      },
      { property: "og:title", content: "Política de privacidad — Youtumundial" },
      {
        property: "og:description",
        content: "Cómo tratamos y protegemos tus datos personales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <StaticPage
      title="Política de privacidad"
      intro="Esta página explica qué datos pedimos, para qué los usamos y qué podés hacer con ellos. Es mantenida por Youtumundial como información editable para nuestros clientes."
      updatedAt="29 de julio de 2026"
    >
      <Section heading="Qué datos recolectamos">
        <p>
          Para procesar un pedido pedimos: nombre y apellido, email, teléfono, dirección de envío,
          ciudad, código postal y país. También guardamos el detalle de tu compra.
        </p>
        <p>
          Los datos de tu tarjeta <strong>no pasan por nuestros servidores</strong>: el pago se
          procesa directamente en el formulario seguro de Stripe, nuestro proveedor de pagos.
        </p>
        <p>
          Si te suscribís al newsletter, guardamos tu email y tu preferencia de recepción de
          comunicaciones comerciales.
        </p>
      </Section>

      <Section heading="Para qué los usamos">
        <p>
          Usamos tus datos únicamente para: preparar y despachar tu pedido, calcular envíos,
          comunicarte el estado del envío, sincronizar la orden con nuestros proveedores de
          dropshipping, atender consultas, enviarte novedades si aceptás el newsletter, y cumplir
          obligaciones contables o legales.
        </p>
      </Section>

      <Section heading="Con quién los compartimos">
        <p>
          Compartimos solo lo imprescindible con: el proveedor de pagos (Stripe), nuestra plataforma
          de tienda (Shopify), el proveedor logístico de dropshipping (SUP Dropshipping), las
          empresas de transporte encargadas de la entrega, y proveedores de Taobao o socios en
          China que preparan el paquete. No vendemos ni cedemos tus datos a terceros con fines
          publicitarios.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          Usamos cookies técnicas necesarias para que el carrito y la sesión funcionen. Podés
          bloquearlas desde tu navegador, aunque en ese caso algunas funciones de la tienda pueden
          dejar de operar correctamente.
        </p>
      </Section>

      <Section heading="Cuánto tiempo los guardamos">
        <p>
          Conservamos los datos de una compra mientras dure la relación comercial y durante el plazo
          que exija la normativa aplicable. Después se eliminan o anonimizan.
        </p>
      </Section>

      <Section heading="Tus derechos">
        <p>
          Podés pedirnos en cualquier momento acceder, corregir o eliminar tus datos personales, así
          como oponerte a su uso para comunicaciones comerciales. Escribinos a{" "}
          <a
            href="mailto:youtumundial@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            youtumundial@gmail.com
          </a>{" "}
          y respondemos dentro de los plazos legales.
        </p>
      </Section>

      <Section heading="Seguridad">
        <p>
          El sitio opera bajo conexión cifrada (HTTPS) y el acceso a la información de pedidos está
          restringido al personal que la necesita para gestionar tu compra.
        </p>
      </Section>
    </StaticPage>
  );
}
