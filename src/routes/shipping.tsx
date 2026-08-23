import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";
import { featuredShippingCountries, FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/config";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping & Returns — Youtumundial" },
      {
        name: "description",
        content:
          "Costs, delivery times, and returns policy for Youtumundial. Free Singapore delivery with no minimum spend.",
      },
      { property: "og:title", content: "Shipping & Returns — Youtumundial" },
      {
        property: "og:description",
        content: "Worldwide shipping costs, delivery times, and 7-day return policy.",
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
      title="Shipping & Returns"
      intro="Reliable worldwide delivery and a simple returns process for your peace of mind."
    >
      <Section heading="Costs & Delivery Times">
        <p className="mb-4 text-primary font-medium">
          🇸🇬 Singapore Special: Free delivery on all orders, no minimum spend.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border border-border rounded-lg">
            <thead className="bg-secondary/50 text-foreground">
              <tr>
                <th className="p-3 font-medium">Destination</th>
                <th className="p-3 font-medium">Cost</th>
                <th className="p-3 font-medium">Estimated Time</th>
              </tr>
            </thead>
            <tbody>
              {featuredShippingCountries.map((c) => (
                <tr key={c.code} className="border-t border-border">
                  <td className="p-3">
                    {c.flag} {c.name}
                  </td>
                  <td className="p-3">US$ {c.shipping}</td>
                  <td className="p-3">{c.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Free shipping on international orders over US$ {FREE_SHIPPING_THRESHOLD}. Delivery times 
          start from payment confirmation.
        </p>
      </Section>

      <Section heading="Order Tracking">
        <p>
          Once your package leaves our warehouse, we'll send you a tracking number via email 
          and WhatsApp. It may take 2-5 days to show initial movements.
        </p>
      </Section>

      <Section heading="Taxes & Customs">
        <p>
          For international shipments, some countries may apply import duties or taxes. These 
          charges are determined by the destination customs and are the responsibility of the buyer.
        </p>
      </Section>

      <Section heading="Returns & Money Back Guarantee">
        <p className="font-medium text-foreground">Love it or Your Money Back!</p>
        <p>
          You have 7 days from receipt to request a full refund or exchange. Items must be 
          unworn, with original tags and packaging.
        </p>
        <p>
          If a product arrived faulty or incorrect, we cover all return costs and offer a 100% 
          replacement or refund. Please send photos within 72 hours of receipt.
        </p>
        <p>
          For exchanges based on preference (size/color), return shipping costs are the 
          responsibility of the buyer. We do not accept returns on underwear or final sale items.
        </p>
      </Section>

      <Section heading="Refunds">
        <p>
          Once a return is approved, the refund is processed to the original payment method 
          within 5-10 business days.
        </p>
      </Section>
    </StaticPage>
  );
}
