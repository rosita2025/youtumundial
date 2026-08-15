# Plan: Stabilize Visa Trust Badge

The user reports that the Visa image is "broken" (naturalWidth: 0), indicating that the current CDN source (`cdn.worldvectorlogo.com`) is either blocking requests or serving invalid data in the preview environment. I will switch to a more reliable, high-availability SVG source for the Visa logo across the entire checkout experience.

## Proposed Changes

### Checkout Page
- Update `src/components/pages/Checkout.tsx`:
    - Replace the broken Visa URL in the Credit Card payment header.
    - Replace the broken Visa URL in the "Guaranteed Safe Checkout" trust section.
    - Use `https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg` (official 2021 logo) or a verified Iconduck fallback.

### Express Checkout
- Update `src/components/checkout/ExpressPayButtons.tsx`:
    - Replace the broken Visa URL in the express payment trust markers.

## Technical Details
- **New Source**: `https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg`
- **Verification**: Run a Playwright script to confirm `naturalWidth > 0` for all Visa images post-update.
