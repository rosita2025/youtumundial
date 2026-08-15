# Plan: Address Login Error and Hide Technical Distractions

The user reported an error when interacting with a "login" or "error" element and requested to hide technical "guards" or distractions. Based on the codebase, this likely refers to technical error messages shown during order tracking or checkout when backend credentials (like SUP API) are missing or fail.

## Proposed Changes

### 1. Technical Error Mitigation
- Review error messages in `src/routes/seguimiento.tsx` and `src/components/pages/Checkout.tsx`.
- Replace technical details (like "SUP login rechazado") with user-friendly messages for customers.

### 2. Hide "Guards" and Distractions
- Ensure that technical labels or indicators (the "guards" the user mentioned) are removed from the customer-facing UI.
- Verify that `CheckoutShell.tsx` and `seguimiento.tsx` remain focused only on the customer's immediate task.

### 3. Shopify/SUP Sync Polish
- Ensure the "Abandoned Checkout" and "Order Sync" flows handle credential failures silently for the user while logging for the admin.

## Technical Details
- Modify `src/lib/suppliers/sup-api.server.ts` to return standardized, non-technical error codes.
- Update `src/routes/seguimiento.tsx` to handle `trackOrder` failures with a more generic "Order not found" message instead of raw error strings.
- Audit `src/components/pages/Checkout.tsx` for any visible technical state indicators.
