# Plan - Synchronize Shopify Products and Fix Catalog

The user reports that Shopify products are not synchronized with the store. Currently, the application uses a multi-layered catalog fetching strategy (Shopify Storefront API -> Shopify Admin API fallback -> SUP Dropshipping -> Local Fallbacks). The issue likely stems from products not being published to the "Lovable" sales channel (preventing Storefront API access) and potential issues with the Admin API fallback or cache.

## Proposed Changes

### 1. Catalog Sourcing & Fallback Enhancement
- Refactor `src/lib/data/data-provider.ts` to improve the robustness of the Shopify catalog load.
- Ensure that the cache is invalidated more aggressively or bypassed when an empty catalog is detected from the primary source.
- Add logging to track which catalog source is being used during the `getCatalog` execution.

### 2. Shopify Admin API Fallback Fixes
- Review `src/lib/shopify/catalog-admin.server.ts` to ensure it correctly handles cases where the Storefront API returns 0 results but the Admin API has "ACTIVE" products.
- Verify that the `productType` and `vendor` fields are correctly mapped from both APIs to ensure filtering works as expected.

### 3. Cache Invalidation Utility
- Add a hidden or triggered mechanism to clear the catalog cache manually if synchronization lag is observed.
- Reduce the `CACHE_TTL` in `src/lib/data/data-provider.ts` slightly to ensure fresher data during frequent updates.

### 4. Verification
- Use `fetch` to test the Shopify Storefront API and Admin API responses (via server functions) to confirm if products are being returned.
- Verify that the "ACTIVE" status filter in `catalog-admin.server.ts` isn't accidentally filtering out products that should be visible.

## Technical Details
- **Primary Catalog:** `src/lib/data/data-provider.ts` calls `fetchShopifyProducts` (Storefront).
- **Fallback:** If Storefront returns 0, it calls `fetchShopifyCatalogAdmin`.
- **Cache:** `catalogCache` in `data-provider.ts` has a 5-minute TTL.
- **Filtering:** `selectProducts` applies filtering on the loaded catalog.

The "no sincronizado" error usually means the Storefront API isn't seeing the products (likely not published to the app channel) OR the Admin API fallback is failing/not triggering correctly.
