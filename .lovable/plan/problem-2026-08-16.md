---
title: Shopify Order Synchronization and Success Page Fixes
description: Fix Shopify order sync, tracking number retrieval, and success page display for a reliable international shopping experience.
---

## Problem
The user reports that Shopify orders are not syncing correctly after payment, and the success page (/checkout/return) is not showing the Shopify order number. Additionally, testing with a $1 coupon showed the Stripe payment works, but the "Thanks for your purchase" message and order number were missing or delayed.

## Proposed Changes

### 1. Shopify Order Sync Hardening (`src/lib/shopify/admin.server.ts`)
- **Strict Error Handling**: Log the exact response body when Shopify returns a non-200 status or GraphQL errors to aid debugging.
- **Improved Retry Logic**: Ensure `createShopifyOrderIdempotent` correctly identifies if a partial order creation occurred to avoid duplicates while trying to recover.
- **Enhanced Mapping**: Ensure Stripe metadata is correctly mapped to Shopify order fields (email, phone, address, items).

### 2. Post-Payment Tasks Reliability (`src/lib/orders/post-payment.server.ts`)
- **Metadata Resilience**: Ensure the `shopify_order_id` and `shopify_order_name` are saved back to Stripe metadata immediately after successful creation.
- **Concurrent Task Safety**: Use a more robust idempotency check to handle cases where multiple triggers (webhook + frontend) happen simultaneously.

### 3. Success Page UX Improvement (`src/routes/checkout.return.tsx`)
- **Status Messaging**: Show a clear "Processing your order" state while Shopify and SUP sync are in progress.
- **Poll Logic**: Increase the frequency of Shopify order name polling to 2-3 seconds for a snappier feel.
- **Manual Sync Trigger**: Improve the "Register order in Shopify" button visibility and feedback if automatic sync fails after several attempts.

### 4. SUP API Integration Review (`src/lib/suppliers/sup-api.server.ts`)
- **Order Identification**: Ensure `findSupOrderByReference` correctly searches both `out_trade_no` and `remark` fields, as SUP APIs can be inconsistent.

## Technical Details
- **Sync Diagnostics**: Expand `/admin/diagnostico` to check if `write_orders` and `read_orders` scopes are truly active by performing a test query.
- **Audit Logs**: Ensure `recordSync` includes the `reference` (Stripe Session ID) for all failed attempts to make tracking easier.
- **Phone Validation**: Relax strict E.164 requirements for countries where Stripe doesn't enforce the `+` prefix, but still sanitize for Shopify.

## Verification Plan
1. **Mock Sync Test**: Use a test Stripe session ID to trigger a manual sync via the Diagnostics page.
2. **Order Creation Check**: Verify that a Shopify Order appears in the Shopify Admin with the tag `youtumundial-checkout`.
3. **Tracking Verification**: Confirm that the success page correctly displays the Shopify order name (e.g., #1001).
