# Plan: Fix Shopify Order Sync and Success Redirect

The user reported that Shopify orders are not syncing correctly after payment and the success page ("Thanks for your purchase") is not showing the order number or is repeating the checkout/stripe flow.

## Problems Identified
1. **Sync Failure**: Shopify orders are not being created even after successful Stripe payment.
2. **Success Page UX**: The `checkout/return` page is not displaying the Shopify order number and might be stuck in a loop or showing redundant error states.
3. **Redundant Redirects**: The user mentioned being sent back to the same checkout or stripe flow despite the payment working.

## Proposed Changes

### 1. Diagnostic Tools Enhancements
- Enhance the diagnostic page `/admin/diagnostico` to check if the `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` are not only present but actually valid by attempting a small query (e.g., fetching shop info).
- Log the last 5 Shopify API errors in the diagnostic view for easier debugging.

### 2. Shopify Admin API Resilience
- **Input Sanitization**: Shopify is very strict about address fields. I will add a sanitization layer to `createShopifyOrder` that strips non-UTF-8 characters or emoji that might cause `userErrors` or 400s.
- **Fallback for Phone**: If `normalizePhone` returns undefined but a phone number was provided, Shopify often rejects the whole order. I'll ensure the phone is omitted entirely if it doesn't match E.164, rather than passing an invalid string.
- **Improved Retry Logic**: Ensure the idempotency key logic doesn't return a "Success" state if the actual order creation failed silently in a way that left the Stripe metadata empty.

### 3. Checkout Return Route (`src/routes/checkout.return.tsx`)
- **Clearer Success State**: Ensure that if the Stripe payment is confirmed (`paid: true`), the UI clearly states the purchase was successful even if the Shopify sync is still pending.
- **Manual Sync Trigger**: If the automatic sync fails, provide a more prominent "Register my order" button for the user to trigger the sync manually once.
- **Auto-Refresh Fix**: Prevent the auto-retry loop from being too aggressive or causing UI flickers.

### 4. Post-Payment Task Hardening (`src/lib/orders/post-payment.server.ts`)
- Ensure `runPostPaymentTasks` correctly handles the case where `snapshot.shopifyOrderId` is missing but a sync attempt was already recorded in `sync-audit`.
- Add more granular logging for the specific step that fails (Customer upsert vs Order creation).

## Verification Plan
1. **Mock Testing**: Simulate a successful Stripe session and verify `fulfillSupOrder` correctly triggers `runPostPaymentTasks`.
2. **Admin Check**: Use the `/admin/diagnostico` route to verify credentials.
3. **Manual Verification**: Check server logs (via `sync-audit`) for any "rejected" entries to identify common field rejection patterns (e.g., zip codes, phone formats).
