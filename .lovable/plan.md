# Plan - Mobile UI Fix & Product Review

Comprehensive audit and fix for mobile layout issues across the product catalog, focusing on visual alignment, spacing, and horizontal containment.

## User Review Required

> [!IMPORTANT]
> I will be fixing horizontal overflow, spacing, and alignment issues specifically for mobile. Are there any other specific "errors" you noticed on the product pages?

## Proposed Changes

### Mobile Layout & Alignment
- **Global Containment**: Ensure `box-sizing: border-box` is applied to all elements and `max-width: 100%` on the root product containers to prevent horizontal shifting.
- **Horizontal Spacing**: Apply consistent `px-4` (16px) horizontal padding to the product detail and grid views on mobile.
- **Overflow Prevention**: Force `overflow-x: hidden` on the page container and main product wrapper.
- **Product Card Fixes**:
  - Adjust the `ProductCard` grid spacing to prevent items from clipping the viewport edge on smaller mobile screens (iPhone SE/12/13 Mini).
  - Ensure price tags and labels wrap correctly.

### Component Refinements
- **Bundle Cards**: Fix flex alignment in `ProductDetail.tsx` bundle section to ensure price and description don't overlap on narrow screens.
- **Trust Badges**: Refine the trust bar padding and font size for better mobile fit.
- **Swatch Grid**: Ensure the color/size swatches in `VariantSelector.tsx` have proper `flex-wrap` and gap to stay within the mobile container.

## Technical Details
- CSS updates in `src/styles.css` using Tailwind v4 `@utility` or global `@layer base` rules.
- Layout adjustments in `src/components/pages/ProductDetail.tsx` and `src/components/product/ProductCard.tsx`.
- Responsive padding adjustments using `px-4 md:px-0` patterns.
