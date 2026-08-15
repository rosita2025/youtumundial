# Plan: Trust Markers and Feature Refinement

The user wants to add specific "trust badges" or features to the product pages and possibly the checkout. These include:
- **Free Singapore delivery (No min. spend)**: This conflicts with the current $45 free shipping policy. I will clarify or implement it as a highlighted feature.
- **Easy Returns**: Returns within 7 days receive a full refund.
- **Keep what fits well**: Love it or Your Money Back!
- **Premium Quality / Built-In Comfort**.

## Proposed Changes

### 1. Update Product Detail Features
- Update the feature list in `src/components/pages/ProductDetail.tsx` to include the new trust markers.
- Add "Premium Quality & Built-In Comfort" as a feature.
- Update return policy text to mention "7 days full refund".
- Add "Love it or Your Money Back!" badge/text.

### 2. Shipping Policy Alignment
- Update the shipping feature text. Since the user specifically requested "Free Singapore delivery (No min. spend)", I will add this as a specific highlight while keeping the $45 global threshold for other regions, or update the global policy if intended. *Note: The store is currently focused on US/CA/PE/INTL, I will add Singapore as a featured highlight.*

### 3. Visual Trust Markers
- Add visual icons or a dedicated "Trust Section" to the product page.
- Ensure these markers are also visible or reinforced in the checkout summary.

## Technical Details
- Modify `src/components/pages/ProductDetail.tsx` feature list.
- Update `src/lib/checkout/config.ts` if shipping rules change.
- Update `src/routes/shipping.tsx` to reflect the 7-day return policy.

## Clarification Needed
- Is the "Free Singapore delivery" a new global rule or specific to Singapore? The store currently has a $45 threshold. I will implement it as requested for Singapore specifically in the shipping info if possible, or as a general banner.
