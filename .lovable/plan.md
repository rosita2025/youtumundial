---
name: Product Care & Guarantee Section
description: Add a high-converting "Product Care & Quality Guarantee" section between reviews and footer on the product detail page.
type: visual_improvement
---

# Plan - Product Care & Guarantee Section

The goal is to add a clean, informative section to the product detail page that reinforces product quality and longevity, bridging the space between customer reviews and the footer.

## Proposed Changes

### 1. New Component Creation
- **ProductCareGuarantee.tsx**: Create a new component in `src/components/product/` to hold this section.
  - **Styles**: Soft beige background (`#FBF9F5`), 12px rounded corners, 1px border (`#EAE6DF`), and 16px internal padding.
  - **Content**: 
    - Title: "Product Care & Quality Guarantee" (Bold, 20px).
    - 4 Card Rows with SVG icons (Easy-to-Clean, Machine Washable, Breathable, 1-Year Guarantee).
    - Responsive layout (Grid on desktop, vertical stack on mobile if needed, though a compact list is requested).

### 2. Product Page Integration
- **ProductDetail.tsx**: Import and place the `ProductCareGuarantee` component below the `ProductReviews` section and any related products, just before the footer area (within the `Layout`).

## Technical Details

- **Icon Set**: Use `lucide-react` icons that match the context (e.g., `Sparkles` or `Droplets` for cleaning, `ShieldCheck` for guarantee).
- **Styling**: Use Tailwind classes for colors and spacing to match the requested hex codes.

## Verification
- Verify placement on mobile and desktop views.
- Ensure the background color and border match the specific HEX values requested.
- Check typography sizes and weights.
