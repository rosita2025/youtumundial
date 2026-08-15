import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";
import { Link } from "@/lib/router-compat";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and Conditions — Youtumundial" },
      {
        name: "description",
        content:
          "Terms of purchase, payments, shipping, trademarks, and responsibility of Youtumundial.",
      },
      { property: "og:title", content: "Terms and Conditions — Youtumundial" },
      {
        property: "og:description",
        content: "Terms of purchase, payments, shipping, trademarks, and responsibility.",
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
      title="Terms and Conditions"
      intro="By making a purchase at Youtumundial you accept the conditions detailed below. This page is maintained by Youtumundial to answer frequently asked questions about our online store."
      updatedAt="July 29, 2026"
    >
      <Section heading="1. The Store">
        <p>
          Youtumundial is an independent online store that sells athletic apparel and women's fashion
          from multiple brands. We operate through youtumundial.com and ship to
          customers worldwide.
        </p>
      </Section>

      <Section heading="2. Multi-brand Nature and Product Origin">
        <p>
          Our catalog includes products inspired by styles from China, South Korea,
          the United States, and Europe. All garments are manufactured in China and imported through
          Taobao suppliers and logistics partners. Brand availability is optional and
          rotational; each product page indicates the brand (vendor), the type of product, and the
          collections to which it belongs.
        </p>
        <p>
          Youtumundial is not the manufacturer or official distributor, licensee, agent, or
          affiliate of the European, American, Korean, or Chinese brands that appear in the store.
          Names, logos, and registered trademarks belong to their respective owners and are used
          only to describe the products supplied to us. We are not responsible for
          third-party intellectual property claims beyond our control as a
          retail importer. If you have a concern about a product, contact us and we
          will review it.
        </p>
      </Section>

      <Section heading="3. Pricing and Currency">
        <p>
          All prices are shown in US Dollars (USD) and include the product value.
          Shipping costs are calculated according to the destination country and shown before
          confirming payment. Prices may change without notice, but never after a purchase is confirmed.
        </p>
      </Section>

      <Section heading="4. Orders and Confirmation">
        <p>
          An order is considered confirmed when payment is approved. We reserve the right
          to cancel and refund an order if the product is out of stock, if we detect an
          obvious error in the published price, or if there is suspicion of fraud.
        </p>
      </Section>

      <Section heading="5. Payment Methods">
        <p>
          Payments are processed through Stripe. We accept credit and debit cards, Link,
          Google Pay, Apple Pay, and other methods enabled by Stripe according to your country and browser.
          Payment is processed in a secure external environment; we do not store your
          card details.
        </p>
      </Section>

      <Section heading="6. Shipping">
        <p>
          Delivery costs and timeframes are detailed in{" "}
          <Link to="/shipping" className="text-foreground underline underline-offset-4">
            Shipping & Returns
          </Link>
          . Timeframes are estimates and may be affected by customs, holidays, or carrier delays.
          We work with dropshipping and international logistics providers to
          prepare and ship packages.
        </p>
      </Section>

      <Section heading="7. Changes and Returns">
        <p>
          These are governed by what is indicated on the shipping and returns page, which is part of these
          terms.
        </p>
      </Section>

      <Section heading="8. Use of the Site">
        <p>
          It is prohibited to use the site for fraudulent purposes, to attempt to breach its security, or
          to reproduce its content, images, and text without written authorization.
        </p>
      </Section>

      <Section heading="9. Intellectual Property">
        <p>
          The Youtumundial brand, logo, original texts, and site design belong to
          Youtumundial. Product images, brand names, and third-party references may
          belong to their respective manufacturers or suppliers.
        </p>
      </Section>

      <Section heading="10. Responsibility">
        <p>
          Our maximum responsibility for any claim is limited to the amount paid for
          the order in question. We do not guarantee continuous availability of the site nor are we
          responsible for delays originating in customs, carriers, or international suppliers.
        </p>
      </Section>

      <Section heading="11. Modifications">
        <p>
          We may update these terms at any time. The current version is always the
          one published on this page, with its update date.
        </p>
      </Section>
    </StaticPage>
  );
}
