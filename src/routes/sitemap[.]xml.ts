import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getCollections, getProducts } from "@/lib/data/data-provider";

const BASE_URL = "https://youtumundial.com";

interface SitemapEntry {
  path: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [collections, products] = await Promise.all([
          getCollections().catch(() => []),
          getProducts().catch(() => []),
        ]);
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/products", changefreq: "daily", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/shipping", changefreq: "monthly", priority: "0.5" },
          { path: "/seguimiento", changefreq: "monthly", priority: "0.4" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
          { path: "/search", changefreq: "monthly", priority: "0.4" },
          { path: "/cart", changefreq: "monthly", priority: "0.3" },
          ...collections.map((c) => ({
            path: `/collections/${c.slug}`,
            changefreq: "weekly" as const,
            priority: "0.8",
          })),
          ...products.map((p) => ({
            path: `/products/${p.slug}`,
            changefreq: "weekly" as const,
            priority: "0.7",
          })),
        ];


        const escapeXml = (value: string) =>
          value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

        // Encode each path segment so slugs with spaces or reserved chars
        // produce a valid URL, then XML-escape the whole <loc> value.
        const toLoc = (path: string) =>
          escapeXml(
            BASE_URL +
              path
                .split("/")
                .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
                .join("/"),
          );

        const seen = new Set<string>();
        const urls = entries
          .filter((e) => {
            if (!e.path || seen.has(e.path)) return false;
            seen.add(e.path);
            return true;
          })
          .map((e) =>
            [
              `  <url>`,
              `    <loc>${toLoc(e.path)}</loc>`,
              e.changefreq
                ? `    <changefreq>${e.changefreq}</changefreq>`
                : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n"),
          );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<?xml-stylesheet type="text/xsl" href="${BASE_URL}/sitemap.xsl"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,

          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
