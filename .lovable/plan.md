# Plan: Update Free Shipping Threshold to $45

The user wants to set the free shipping threshold to **$45** worldwide and ensure it works correctly without errors.

## Proposed Changes

### Configuration
- Update `FREE_SHIPPING_THRESHOLD` in `src/lib/checkout/config.ts` from `100` to `45`.

### UI Components
- Verify `src/components/layout/AnnouncementBar.tsx` already reflects the `$45` message (it seems to have been updated recently, but I will ensure it matches the logic).

## Verification Plan

### Automated Tests
- [ ] Run a Playwright script to:
    - Add items to the cart totaling less than $45 and verify shipping is charged.
    - Add items totaling $45 or more and verify shipping becomes "Gratis" (Free).
    - Verify the calculation works for different countries (PE, US, etc.).

### Manual Verification
- Go to the shop, add products until the subtotal is > $45.
- Go to checkout and verify the Shipping line says "Gratis".
