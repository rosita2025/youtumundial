import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Legal Disclaimer — Youtumundial" },
      {
        name: "description",
        content:
          "Youtumundial legal notice regarding trademarks, product origin, availability, timeframes, and information published on the site.",
      },
      { property: "og:title", content: "Legal Disclaimer — Youtumundial" },
      {
        property: "og:description",
        content: "Scope and limits of the information published in the store.",
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
      title="Legal Disclaimer"
      intro="This page clarifies the scope and limits of the information published on Youtumundial. It is maintained by Youtumundial as editable content to answer our customers' frequently asked questions."
      updatedAt="July 29, 2026"
    >
      <Section heading="1. General Information">
        <p>
          The content of this site is for informational and commercial purposes. We do our best to
          keep descriptions, prices, images, and availability updated, but there may be
          typographical errors or occasional outdated information that we correct as soon as we detect them.
        </p>
      </Section>

      <Section heading="2. Multi-brand Nature and Product Origin">
        <p>
          Youtumundial is an independent online store that sells athletic apparel and women's fashion
          inspired by styles from China, South Korea, the United States, and Europe. Our
          catalog is multi-brand and rotational: each product indicates the brand (vendor), the product type,
          and the collections it belongs to.
        </p>
        <p>
          All garments are manufactured in China and imported through Taobao suppliers and
          logistics partners. We offer competitive prices because we work directly with
          manufacturers and wholesalers in China, without official intermediaries of the design brands.
        </p>
      </Section>

      <Section heading="3. Third-party Trademarks">
        <p>
          Youtumundial is not the manufacturer, official distributor, licensee, agent, or affiliate of
          the European, American, Korean, or Chinese brands that appear in the store. The names,
          logos, registered trademarks, and third-party references belong to their respective owners and
          are used solely for descriptive or identification purposes, to help customers
          recognize the style or inspiration of each product.
        </p>
        <p>
          We are not responsible for third-party intellectual property claims beyond
          our control as a retail importer. If you have a concern about a product,
          write to us at{" "}
          <a
            href="mailto:youtumundial@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            youtumundial@gmail.com
          </a>{" "}
          and we will review it.
        </p>
      </Section>

      <Section heading="4. Colors and Photography">
        <p>
          Photos are for reference. The actual color of a garment may vary slightly depending on the
          lighting of the photo, the supplier that provides it, and the calibration of your screen. These
          minor differences are not considered a product defect.
        </p>
      </Section>

      <Section heading="5. Sizes and Measurements">
        <p>
          Sizes follow the guide published for each product and may present variations of up to
          2 cm due to textile manufacturing. When in doubt, consult us before buying.
        </p>
      </Section>

      <Section heading="6. Availability and Timeframes">
        <p>
          The availability shown is for reference and depends on the stock of our suppliers in
          China. Delivery timeframes are estimates and do not constitute a contractual guarantee: they may
          be affected by customs, carriers, holidays, or force majeure situations.
        </p>
      </Section>

      <Section heading="7. External Links">
        <p>
          The site may contain links to third-party platforms (payments, carriers, social
          networks). We do not control or respond for the content, policies, or practices of
          those sites.
        </p>
      </Section>

      <Section heading="8. Use of Products">
        <p>
          We are not responsible for damages resulting from improper use of garments or from
          failure to follow the washing and care instructions indicated on the label.
        </p>
      </Section>

      <Section heading="9. Contact">
        <p>
          For inquiries about this legal notice or about a specific product, write to us at{" "}
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
