import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";
import { checkoutConfig } from "@/lib/checkout/config";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, Clock } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Youtumundial" },
      {
        name: "description",
        content:
          "Contact Youtumundial by WhatsApp or email for questions about orders, sizing, brands, payments and worldwide shipping.",
      },
      { property: "og:title", content: "Contact — Youtumundial" },
      {
        property: "og:description",
        content: "Questions about orders, sizing, brands, payments and shipping.",
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
      title="Contact"
      intro="Questions about a size, a brand, an order or a payment? We're on the other side."
    >
      <Section heading="Support channels">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-5">
            <MessageCircle className="mb-3 text-foreground" size={22} />
            <h3 className="font-medium text-foreground">WhatsApp</h3>
            <p className="text-sm mt-1">The fastest way to ask questions and track an order.</p>
            <Button asChild className="mt-4">
              <a href={wa} target="_blank" rel="noopener noreferrer">
                Message us on WhatsApp
              </a>
            </Button>
          </div>
          <div className="rounded-lg border border-border p-5">
            <Mail className="mb-3 text-foreground" size={22} />
            <h3 className="font-medium text-foreground">Email</h3>
            <p className="text-sm mt-1">For claims, invoicing and returns.</p>
            <Button asChild variant="outline" className="mt-4">
              <a href="mailto:hola@youtumundial.com">hola@youtumundial.com</a>
            </Button>
          </div>
        </div>
      </Section>

      <Section heading="Support hours">
        <p className="flex items-center gap-2">
          <Clock size={18} /> Monday to Saturday, 9:00 AM to 8:00 PM (Peru time, GMT-5).
        </p>
        <p>We answer every message within 24 business hours.</p>
      </Section>

      <Section heading="Brand and product enquiries">
        <p>
          We are a multi-brand store: our garments are manufactured in China and imported through
          Taobao and partner suppliers. If you need details about the brand (vendor), materials or
          sizing of a specific item, send us the product link and we will confirm it with the
          supplier.
        </p>
      </Section>

      <Section heading="Before you write">
        <p>
          If your question is about an existing order, have your order number and the email you used
          at checkout ready — that way we can solve it in a single message.
        </p>
      </Section>
    </StaticPage>
  );
}
