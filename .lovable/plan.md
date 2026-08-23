# Plan - Shopify Sync Reliability Improvement

The user reports that the Shopify order synchronization is not working. Based on the codebase investigation, the order creation logic already includes retry mechanisms, but it might be failing if the customer upsert fails or if certain fields are rejected by Shopify despite retries.

## Technical Details

- **Customer Sync**: Improve `upsertShopifyCustomer` to be more resilient, especially when address fields might be invalid according to Shopify's specific regional rules.
- **Order Creation Fallback**: Strengthen `createShopifyOrder` in `src/lib/shopify/admin.server.ts` to ensure that if the customer association fails, it proceeds with a guest order instead of returning a failure to the post-payment flow.
- **Improved Logging**: Enhance sync audit logs to include more context about which specific field caused a rejection from Shopify.

## Implementation Steps

### 1. Shopify Admin API Improvements
- Modify `createShopifyOrder` in `src/lib/shopify/admin.server.ts` to ensure the final attempt always tries to create the order with minimal required data if all other attempts fail.
- Update `buildOrder` to handle cases where address or customer data might be partially missing or invalid.

### 2. Customer Sync Hardening
- Update `src/lib/shopify/customers.server.ts` to better handle Shopify's validation errors for addresses (e.g., zip code or province mismatches).

### 3. Sync Audit & Diagnostics
- Ensure `recordSync` captures the full response from Shopify's `userErrors` to make debugging easier via `/admin/diagnostico`.

---
**Note**: The user specified "no funciona syn de orders se shopify" and "siempre shopify plataforma" when asked for diagnostic info, suggesting they are checking directly in their Shopify Admin panel and seeing no orders.
