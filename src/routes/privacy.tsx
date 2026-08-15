import { createFileRoute } from "@tanstack/react-router";
import { StaticPage, Section } from "@/components/pages/StaticPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Youtumundial" },
      {
        name: "description",
        content:
          "How Youtumundial collects, uses, and protects your personal data when shopping in our store.",
      },
      { property: "og:title", content: "Privacy Policy — Youtumundial" },
      {
        property: "og:description",
        content: "How we treat and protect your personal data.",
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
      title="Privacy Policy"
      intro="This page explains what data we request, what we use it for, and what you can do with it. It is maintained by Youtumundial as editable information for our customers."
      updatedAt="July 29, 2026"
    >
      <Section heading="What data we collect">
        <p>
          To process an order we ask for: first and last name, email, phone, shipping address,
          city, postal code, and country. We also save your purchase details.
        </p>
        <p>
          Your card details <strong>do not pass through our servers</strong>: the payment is
          processed directly in the secure form of Stripe, our payment provider.
        </p>
        <p>
          If you subscribe to the newsletter, we save your email and your preference for receiving
          commercial communications.
        </p>
      </Section>

      <Section heading="How we use your data">
        <p>
          We use your data solely to: prepare and ship your order, calculate shipping,
          communicate the shipping status, synchronize the order with our dropshipping providers,
          answer inquiries, send you news if you accept the newsletter, and comply with
          accounting or legal obligations.
        </p>
      </Section>

      <Section heading="Who we share it with">
        <p>
          We share only what is essential with: the payment provider (Stripe), our store platform
          (Shopify), the dropshipping logistics provider (SUP Dropshipping), the
          transport companies in charge of delivery, and Taobao providers or partners in
          China who prepare the package. We do not sell or lease your data to third parties for
          advertising purposes.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          We use technical cookies necessary for the cart and session to function. You can
          block them from your browser, although in that case some store functions may
          stop operating correctly.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          We keep the data of a purchase for as long as the commercial relationship lasts and during the period
          required by applicable regulations. Afterwards, they are deleted or anonymized.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          You can ask us at any time to access, correct, or delete your personal data, as well
          as object to its use for commercial communications. Write to us at{" "}
          <a
            href="mailto:youtumundial@gmail.com"
            className="text-foreground underline underline-offset-4"
          >
            youtumundial@gmail.com
          </a>{" "}
          and we will respond within legal timeframes.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          The site operates under an encrypted connection (HTTPS) and access to order information is
          restricted to personnel who need it to manage your purchase.
        </p>
      </Section>
    </StaticPage>
  );
}
