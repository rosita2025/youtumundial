# Plan - Fix Checkout Images and Improve High-Conversion UX

The user is reporting a broken "credit card" image (specifically Visa) and wants to improve the checkout conversion for "quick purchases". I will audit all payment icons, fix the broken ones using confirmed stable sources, and add high-conversion trust elements to the checkout flow.

## User Review

- Broken credit card/Visa image in checkout.
- Need to improve checkout conversion for "quick purchase" (express checkout).

## Proposed Changes

### 1. Fix Broken Payment Icons
- Audit `src/components/pages/Checkout.tsx`, `src/components/checkout/ExpressPayButtons.tsx`, and `src/components/pages/Cart.tsx`.
- Replace the current Visa PNG source (which was previously reported as broken or may be failing again) with a more robust SVG or alternative stable source if needed.
- Ensure all payment icons (Mastercard, Amex, Discover, PayPal, Apple Pay, Google Pay) use consistent, high-quality, and high-availability sources.

### 2. Improve High-Conversion Checkout
- **Express Checkout Prominence**: Ensure express buttons (Google Pay, Apple Pay, PayPal) are clearly visible and styled for high conversion.
- **Trust Elements**: Add "Secure SSL" markers and "Guaranteed Safe Checkout" badges near the payment submission button.
- **Urgency/Scarcity**: Add a subtle "Order expires in X:XX" or "Items reserved for X:XX" timer in the checkout header or summary if appropriate for the brand.
- **Simplified Header/Footer**: Ensure the checkout shell remains distraction-free as previously implemented.
- **Payment Method Clarity**: Improve the styling of the "Credit Card" selection to look more professional and official.

### 3. Product Page "Quick Purchase" Optimization
- Add payment trust badges directly below the "Add to Cart" button on the `src/components/pages/ProductDetail.tsx` page to build trust before the user leaves the product page.
- Ensure the "Sticky Add to Cart" bar includes a clear price and high-contrast button.

## Technical Details

- Use stable Wikimedia or VectorLogo.zone SVG sources for icons.
- Avoid external CDNs that have proven unreliable in the preview environment.
- Maintain existing Tailwind v4 styling conventions.

## Success Criteria

- All payment logos (Visa, etc.) load correctly without broken image icons.
- The checkout page feels more secure and optimized for fast completion.
- Trust badges are visible on the product page, cart, and checkout.
