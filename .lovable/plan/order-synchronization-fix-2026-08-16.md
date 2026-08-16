---
name: Order Sync Fix
description: Fix for Shopify order creation and sync after successful Stripe payments.
type: feature
---

# Order Synchronization Fix

The user reports that while Stripe payments are successful, Shopify orders are not being created, and the confirmation page doesn't show the order number.

## Diagnosis
1. **Fulfillment Flow**: `fulfillSupOrder` in `src/lib/suppliers/fulfillment.functions.ts` is responsible for calling `runPostPaymentTasks`.
2. **Order Creation**: `runPostPaymentTasks` calls `createShopifyOrderIdempotent` in `src/lib/shopify/admin.server.ts`.
3. **Permissions**: `createShopifyOrderIdempotent` checks for `read_orders` and `write_orders` scopes.
4. **Auth**: The Admin API uses `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`.
5. **Issue**: If the client secret/ID flow fails or permissions are missing, the order isn't created. The user confirmed the app is updated, but synchronization might be failing due to tight validation or scope mismatches.

## Proposed Changes
1. **Logging**: Add more detailed error logging in `createShopifyOrder` to see exactly why Shopify rejects it.
2. **Resilience**: Ensure `fulfillSupOrder` always returns `shopifyOrderNumber` if it exists in Stripe metadata, even if the current sync attempt fails.
3. **UI Feedback**: Improve the "Generating your order number..." state in `CheckoutReturn` to handle cases where sync is delayed or requires manual retry.
4. **Validation**: Relax Shopify phone validation if it's causing the entire order to fail (it already has some reintents, but I'll check if they cover all cases).

## Technical Details
- Update `src/lib/shopify/admin.server.ts`: Improve `createShopifyOrder` to log specific `userErrors` from Shopify.
- Update `src/lib/orders/post-payment.server.ts`: Ensure `shopifyOrderName` is always captured and returned correctly.
- Update `src/routes/checkout.return.tsx`: Add a visual indication if sync is pending and ensure the retry button is prominent if `orderNumber` is missing.
