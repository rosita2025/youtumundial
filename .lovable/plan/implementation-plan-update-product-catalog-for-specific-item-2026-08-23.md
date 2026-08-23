# Implementation Plan - Update Product Catalog for Specific Items

The user wants to update the catalog for two specific products:
1. "slanted shpulder slveedeless T-shirt Womens"
2. "Collar metal Buckle Twitter Long-slevvedt top"

These products are currently synced from Shopify. Since the store uses a dynamic sync with Shopify (via Admin and Storefront APIs), updating them in the app requires ensuring they are present in the Shopify catalog and that the sync mechanism is working correctly.

## User Review Required

> [!IMPORTANT]
> The app is currently set up to synchronize products directly from your Shopify store (`youtumundial-4ndozgzu.myshopify.com`). To see these products on your site, you should:
> 1. **Add the products in your Shopify Admin** with the exact titles you mentioned.
> 2. **Ensure they are marked as "Active"** and published to the "Headless" or "Storefront" sales channel.
> 3. **Wait a few minutes** for the automatic cache (5 minutes) to update, or I can manually trigger a cache invalidation.

## Proposed Changes

### 1. Catalog Diagnostics
- Verify if these products already exist in the Shopify catalog but are hidden.
- Check the current sync status.

### 2. Manual Cache Invalidation (Optional)
- Add a temporary way to force-refresh the catalog if the user has already updated Shopify.

### 3. Verification
- Use Playwright to check the `/products` page and ensure the new products appear.

## Technical Details

- **Data Source**: `src/lib/shopify/admin-auth.server.ts` handles the credentials, and `src/lib/data/data-provider.ts` fetches the catalog.
- **Cache**: `src/lib/data/data-provider.ts` has a `CACHE_TTL` of 5 minutes.
- **Sync Logic**: The app first tries `fetchShopifyProducts` (Storefront API) and falls back to `fetchShopifyProductsAdmin` (Admin API) to show "Active" but unpublished products.

## Questions
- Have you already added these products to your Shopify store?
- If so, are they appearing in your Shopify Admin as "Active"?
