---
name: Shopify Order Sync Fix
description: Diagnostic and fix for Shopify order synchronization failures.
type: feature
---

# Shopify Order Synchronization Fix

The user reports that orders are still not syncing with Shopify, even after recent attempts to fix the confirmation page and order creation logic.

## Diagnosis
1. **Sync Visibility**: The current system logs sync attempts to a server-side `SyncAuditEntry` buffer, but this isn't visible to the user, making it hard to diagnose failures.
2. **Permission Conflicts**: The order creation logic checks for `read_orders` and `write_orders`. If either is missing, it skips the sync.
3. **Draft Order Sync**: Abandoned checkouts use `Draft Orders`. If the app secret doesn't have `write_draft_orders`, this also fails.
4. **Resiliency**: The recent fix added logging, but if the underlying issue is authentication or missing scopes, orders will continue to fail.

## Proposed Changes
1. **Sync Diagnostics Endpoint**: Create a new server function/route to check the actual status of Shopify credentials and scopes, providing clear feedback on what's missing.
2. **Enhanced Resilience**:
   - If `orderCreate` fails with specific recoverable errors, retry with even further reduced data.
   - Ensure `requireShopifyScope` doesn't block the entire flow if a non-critical scope (like `read_draft_orders`) is missing but `write_orders` is present.
3. **Debug Logging**: Expose the last few sync errors in a safe way for debugging.

## Technical Details
- Update `src/lib/shopify/admin.server.ts`:
  - Add `getSyncStatus` server function to report scope health.
  - Modify `requireShopifyOrderAccess` to be more descriptive about *which* secret is missing if any.
- Update `src/routes/checkout.return.tsx`:
  - If `shopifyOrderNumber` is missing, show a specific diagnostic message if the sync was explicitly "rejected" or "error" vs just "pending".
- New Diagnostic Route: Add `/admin/diagnostico` (or similar) to let the admin check if the API is actually connected.
