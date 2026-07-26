import { createServerFn } from "@tanstack/react-start";
import type { Product } from "@/lib/data/types";

/**
 * WooCommerce data source (via the Lovable connector gateway).
 *
 * Flow: SUP Dropshipping -> WooCommerce -> this app.
 * While the WooCommerce connector is not linked, these functions return `null`
 * and the app transparently falls back to the demo catalog.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/woocommerce";

interface WooImage {
  id: number;
  src: string;
  alt?: string;
}

interface WooProduct {
  id: number;
  slug: string;
  name: string;
  description?: string;
  short_description?: string;
  price: string;
  regular_price?: string;
  sale_price?: string;
  sku?: string;
  stock_status?: string;
  date_created?: string;
  images?: WooImage[];
  categories?: { slug: string; name: string }[];
  tags?: { name: string }[];
}

const stripHtml = (html?: string) =>
  (html ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const toNumber = (value?: string) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};

function mapProduct(woo: WooProduct): Product {
  const price = toNumber(woo.price || woo.regular_price);
  const regular = toNumber(woo.regular_price);
  const available = woo.stock_status !== "outofstock";

  return {
    id: String(woo.id),
    slug: woo.slug,
    title: woo.name,
    description: stripHtml(woo.description || woo.short_description),
    price,
    compareAtPrice: regular > price ? regular : undefined,
    images: (woo.images ?? []).map((image) => ({
      id: String(image.id),
      url: image.src,
      altText: image.alt || woo.name,
      width: 1200,
      height: 1500,
    })),
    variants: [
      {
        id: `${woo.id}-default`,
        title: "Default",
        price,
        compareAtPrice: regular > price ? regular : undefined,
        available,
        sku: woo.sku ?? String(woo.id),
        options: [],
      },
    ],
    collections: (woo.categories ?? []).map((category) => category.slug),
    tags: (woo.tags ?? []).map((tag) => tag.name),
    available,
    createdAt: woo.date_created ?? new Date().toISOString(),
  };
}

async function wooFetch(path: string): Promise<unknown[] | null> {
  const lovableApiKey = process.env.LOVABLE_API_KEY;
  const wooApiKey = process.env.WOOCOMMERCE_API_KEY;

  // Connector not linked yet -> caller falls back to demo data.
  if (!lovableApiKey || !wooApiKey) return null;

  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": wooApiKey,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`WooCommerce gateway request failed [${response.status}]: ${body}`);
    throw new Error(`WooCommerce request failed [${response.status}]: ${body}`);
  }

  const json = await response.json();
  return Array.isArray(json) ? json : [];
}

/** Returns the live WooCommerce catalog, or null when the store is not connected. */
export const fetchWooProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Product[] | null> => {
    const rows = await wooFetch("/products?per_page=100&status=publish");
    if (rows === null) return null;
    return (rows as WooProduct[]).map(mapProduct);
  },
);
