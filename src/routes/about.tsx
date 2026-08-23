import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";
import { Link } from "@/lib/router-compat";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Youtumundial — Multi-Brand Sportswear & Women's Fashion" },
      {
        name: "description",
        content:
          "Youtumundial is a multi-brand online store for sportswear and women's fashion from China, South Korea, the United States and Europe — manufactured in China and shipped worldwide at factory-direct prices.",
      },
      {
        property: "og:title",
        content: "About Youtumundial — Multi-Brand Sportswear & Women's Fashion",
      },
      {
        property: "og:description",
        content:
          "Our story: multi-brand styles from China, South Korea, the US and Europe, made in China and imported through Taobao suppliers at the best possible price.",
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
      intro="Youtumundial is your destination for independent fashion and sportswear, offering curated styles from global markets delivered directly to your door."
      <Section heading="Our story">
        <p>
          Youtumundial started as a small personal project: finding the same styles that big brands
          sell in shopping malls, but at the price they actually cost at the factory. After years of
          buying, comparing and testing garments coming out of Chinese manufacturing hubs, we
          realised most people pay two or three times more for the exact same product simply because
          of the storefront it is sold in.
        </p>
        <p>
          So we built our own store. No physical shops, no middlemen chains, no inflated retail
          markup — just a curated catalog, direct sourcing and honest shipping. Today Youtumundial
          serves customers across Latin America, North America and Europe from one single online
          store.
        </p>
      </Section>

      <Section heading="A multi-brand catalog">
        <p>
          We are a multi-brand store. Our catalog mixes sportswear and women's fashion inspired by
          and sourced from four of the most influential style markets in the world:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>China</strong> — streetwear, technical sportswear and fast-moving trend pieces.
          </li>
          <li>
            <strong>South Korea</strong> — minimal silhouettes, oversized fits and K-fashion
            essentials.
          </li>
          <li>
            <strong>United States</strong> — athleisure, gym and everyday casual basics.
          </li>
          <li>
            <strong>Europe</strong> — clean, elegant lines for women's ready-to-wear.
          </li>
        </ul>
        <p>
          Brand availability is optional and rotating: every product page shows the brand (vendor),
          the product type and the collections it belongs to, so you always know exactly what you
          are buying. You can also filter the whole catalog by brand on the{" "}
          <Link to="/products" className="text-foreground underline underline-offset-4">
            products page
          </Link>
          .
        </p>
      </Section>

      <Section heading="Made in China, imported through Taobao suppliers">
        <p>
          All the garments we sell are manufactured in China and imported through our Taobao and
          partner-supplier network. Working directly with these factories and marketplaces is what
          allows us to offer the most economical price on every product in the catalog, including
          brand-name options, without cutting corners on fabric, fit or finishing.
        </p>
        <p>
          Each item is checked by our supplier before dispatch. Production and transit times vary by
          destination and are always shown before you pay — see{" "}
          <Link to="/shipping" className="text-foreground underline underline-offset-4">
            Shipping &amp; Returns
          </Link>
          .
        </p>
      </Section>

      <Section heading="Brand names and responsibility">
        <p>
          Youtumundial is an independent retailer. We are not the manufacturer, and we are not an
          official distributor, licensee, agent or affiliate of any European, American, Korean or
          Chinese brand mentioned in this store. Brand names, logos and trademarks belong to their
          respective owners and are used only to describe the products supplied to us.
        </p>
        <p>
          Products are imported from Chinese suppliers and Taobao marketplace sellers. We cannot
          verify or guarantee licensing arrangements upstream of our suppliers, and we assume no
          responsibility for the trademark claims of third-party European or international brands.
          If you have any concern about a specific listing, contact us and we will review or remove
          it. Full details are in our{" "}
          <Link to="/disclaimer" className="text-foreground underline underline-offset-4">
            legal disclaimer
          </Link>
          .
        </p>
      </Section>

      <Section heading="Where we ship">
        <p>
          We ship worldwide. Rates are calculated per market at checkout — United States, Canada and
          international — and you will always see the final cost before paying.
        </p>
      </Section>

      <Section heading="Talk to us">
        <p>
          Questions about sizing, orders, brands or payments? Reach us from the{" "}
          <Link to="/contact" className="text-foreground underline underline-offset-4">
            contact page
          </Link>
          . We reply every day.
        </p>
      </Section>
    </StaticPage>
  );
}
