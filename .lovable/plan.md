# Plan - Fix Broken Payment Logos

Fix broken image URLs for Visa and Mastercard in the Checkout and Sticky Buy Bar components to ensure high-conversion trust markers are visible to customers.

## User Review Required

> [!IMPORTANT]
> The broken images were reported on the Credit Card payment section and the Sticky Buy Bar. I have identified outdated URLs as the cause and will replace them with stable, high-availability sources.

## Proposed Changes

### Visual & Assets
- Update Visa and Mastercard logos in `src/components/pages/Checkout.tsx`.
- Update Visa, Mastercard, and PayPal logos in `src/components/product/StickyAddToCart.tsx`.
- Synchronize trust badges in `src/components/checkout/ExpressPayButtons.tsx` and `src/components/pages/Cart.tsx`.
- Add "Guaranteed Safe Checkout" badges to `src/components/pages/ProductDetail.tsx` (already partially implemented, but will verify URLs).

### Technical Details
- **Stable Sources**: Use `https://upload.wikimedia.org/wikipedia/commons/...` for all major payment brands.
- **Component Audit**: 
  - `Checkout.tsx`: Line 171, 411, 506.
  - `StickyAddToCart.tsx`: Lines 73-75.
  - `ExpressPayButtons.tsx`: Lines 128, 141, 157, 178-182.
  - `Cart.tsx`: Lines 165-169.
  - `ProductDetail.tsx`: Lines 212-216.

## Verification Plan
- Use `execute_preview_javascript` to verify that all images load successfully (naturalWidth > 0).
- Check the Sticky Buy Bar specifically by scrolling down in the preview to trigger its visibility.
