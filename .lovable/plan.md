# Plan - Fix Visa Badge and Secure Payments Label

The user reported that the Visa icon/badge appears "broken" or missing and wants to ensure the "Secure Global Payments" section correctly displays the Visa logo.

## User Preferences
- Ensure Visa logo is present and functional in the checkout payment section.
- Maintain the "Secure Global Payments" branding.

## Proposed Changes

### 1. Fix Visa Image URL
- The current Visa SVG URL `https://cdn.worldvectorlogo.com/logos/visa.svg` might be unreliable or blocked.
- Replace it with a more stable source or a different variant from the same provider that is known to work, or use a reliable CDN like `cdnjs` or `raw.githubusercontent.com`.
- I will update the URL to a more standard one: `https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg` or similar stable CDN.

### 2. Update Payment Badges in Components
- Update `src/components/pages/Checkout.tsx` to ensure all payment icons (Visa, Mastercard, Amex, Discover, PayPal) are using high-quality, stable URLs.
- Ensure the "Secure Global Payments" label is consistently styled and accompanied by working trust badges.

## Technical Details
- Files to modify:
    - `src/components/pages/Checkout.tsx`: Update image `src` for Visa and other badges.
    - `src/components/checkout/ExpressPayButtons.tsx`: If it also contains badges under the "Secure Global Payments" text, update them there too.

## Verification Plan
- Check the checkout page preview.
- Verify that the Visa logo renders correctly alongside other payment methods.
- Confirm the "Secure Global Payments" text is visible and properly formatted.
