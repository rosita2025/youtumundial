/**
 * Shopify Storefront API Client
 * 
 * This file provides the client for connecting to Shopify's Storefront API.
 * Currently a placeholder - enable by adding environment variables.
 * 
 * Required Environment Variables:
 * - VITE_SHOPIFY_STORE_DOMAIN: your-store.myshopify.com
 * - VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN: your-storefront-access-token
 * 
 * To get these credentials:
 * 1. Go to your Shopify Admin
 * 2. Navigate to Settings > Apps and sales channels > Develop apps
 * 3. Create a new app or select existing
 * 4. Configure Storefront API access
 * 5. Copy the Storefront API access token
 */

const domain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export const SHOPIFY_ENABLED = Boolean(domain && storefrontAccessToken);

const endpoint = domain ? `https://${domain}/api/2024-01/graphql.json` : '';

/**
 * Execute a GraphQL query against Shopify Storefront API
 */
export async function shopifyFetch<T>({
  query,
  variables,
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  if (!SHOPIFY_ENABLED) {
    throw new Error('Shopify is not configured. Add environment variables.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontAccessToken!,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();

  if (json.errors) {
    console.error('Shopify API Error:', json.errors);
    throw new Error(json.errors[0]?.message || 'Shopify API Error');
  }

  return json.data;
}

// Example GraphQL queries (for reference when implementing)
export const EXAMPLE_QUERIES = {
  // Get all products
  GET_PRODUCTS: `
    query GetProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            handle
            title
            description
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                  width
                  height
                }
              }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                  }
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  // Get single product by handle
  GET_PRODUCT: `
    query GetProduct($handle: String!) {
      product(handle: $handle) {
        id
        handle
        title
        description
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 10) {
          edges {
            node {
              url
              altText
              width
              height
            }
          }
        }
        variants(first: 50) {
          edges {
            node {
              id
              title
              price {
                amount
              }
              availableForSale
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `,

  // Get collections
  GET_COLLECTIONS: `
    query GetCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            handle
            title
            description
            image {
              url
              altText
            }
            products(first: 1) {
              edges {
                cursor
              }
            }
          }
        }
      }
    }
  `,
};
