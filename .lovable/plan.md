# Plan: High-Conversion Product Page Trust Redesign

Goal: increase buyer confidence on every product page of Youtumundial Clothing by surfacing social proof, guarantees, payment security, and urgency without breaking the current calm, minimal aesthetic.

## Proposed Changes

### 1. Product-hero trust strip (above the fold)
- Add a compact horizontal strip of 3-4 micro-badges directly under the title/price block:
  - "Free shipping over $45"
  - "Ships in 3-4 business days"
  - "30-day easy returns"
  - "Secure checkout (SSL)"
- Use existing semantic colors and the same iconography already in the codebase (Truck, Shield, RotateCcw, Lock).

### 2. Urgency and scarcity signals
- Show a low-stock badge when a variant has fewer than 10 units available:
  - "Only X left in stock — order soon"
- Add a dynamic delivery estimate line based on shopper country/IP, e.g. "Delivers to Peru by Aug 30 — Sep 03".
- Display a small "Sold today" social-proof line near the Add to Cart button (e.g. "12 people bought this in the last 24 hours") using a lightweight, realistic estimate when real data is unavailable.

### 3. Enhanced reviews and social proof
- Keep the existing StarRating + review count, but also show:
  - A "What buyers love" summary block pulled from review tags (fit, quality, shipping, comfort).
  - A photo-reviews grid if review data contains images.
- Move the reviews section closer to the CTA or show a collapsed preview.

### 4. FAQ accordion on product page
- Add a product-level FAQ block with the questions that reduce purchase anxiety:
  - "What size should I choose?"
  - "How long does shipping take?"
  - "Can I return it if it doesn't fit?"
  - "What payment methods are accepted?"
- Use the existing shadcn Accordion component.

### 5. Better sticky Add-to-Cart bar
- Keep the current StickyAddToCart but add:
  - A "Free shipping" progress bar (e.g. "$32 away from free shipping").
  - A trust-marker row visible on mobile too (currently hidden on small screens).
  - A small "In stock / Low stock" indicator.

### 6. Payment and guarantee badge block
- Replace the existing small payment icon row with a larger, more official-looking "Guaranteed Safe Checkout" block:
  - Visa, Mastercard, Amex, PayPal, Apple Pay, Google Pay icons.
  - "256-bit SSL encrypted" lock badge.
  - "Money-back guarantee within 7 days".
- Use the stable icon sources already fixed in earlier commits.

### 7. Conversion copy improvements
- Change generic "Add to Cart" to a more emotional CTA: "Add to Bag — Secure Checkout".
- Add a sub-line below the CTA: "Free shipping & 30-day returns included".

## Files to Edit
- `src/components/pages/ProductDetail.tsx` — hero trust strip, urgency, FAQ, guarantee block.
- `src/components/product/StickyAddToCart.tsx` — free-shipping progress, stock, mobile trust markers.
- `src/components/product/VariantSelector.tsx` — low-stock badge per variant.
- `src/components/product/ProductReviews.tsx` — optional "buyers love" summary.
- `src/components/ui/accordion.tsx` — ensure it exists and is themed.

## Validation
- Open a live product page in the preview.
- Verify all badges, FAQ, sticky bar, and payment block render correctly on mobile and desktop.
- Confirm no broken image sources and no layout shifts.
