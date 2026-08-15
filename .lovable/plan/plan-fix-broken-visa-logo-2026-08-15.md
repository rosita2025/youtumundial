# Plan - Fix Broken Visa Logo

The user is reporting that the Visa logo is broken again. Although we previously switched to `vectorlogo.zone`, it appears to be failing in the current environment (confirmed by `naturalWidth: 0`). I will switch to another high-availability source, specifically the official Wikimedia source, and ensure all instances are updated.

## Proposed Changes

### Checkout Components
- Update `src/components/pages/Checkout.tsx`
    - Replace all instances of the Visa SVG URL with `https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg` or a stable alternative like `https://static-00.iconduck.com/assets.00/visa-icon-2048x628-6857y2l3.png` if SVGs continue to be blocked.
    - I'll try the Wikimedia SVG first as it's the standard for high-res icons.
- Update `src/components/checkout/ExpressPayButtons.tsx`
    - Replace the Visa logo URL to match the new stable source.
- Update `src/components/checkout/OrderSummary.tsx` (if it exists and has badges).

## Technical Details
- Use `https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg` which is the modern blue-and-yellow Visa logo.
- Alternatively, use a reliable data URI or a fallback mechanism that hides the image if it fails to load.

## Verification Plan
- Run a Playwright script to check if the new Visa logo URL returns a non-zero `naturalWidth`.
- Manually inspect the checkout preview for broken images.
