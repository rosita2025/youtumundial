# Plan: Rebuild Customer Reviews Widget (Loox UGC Style)

Redesign the review section to maximize conversion with a responsive photo grid, vertical cards, and an immersive lightbox experience.

## User Review

- Mobile: 2-column side-by-side grid.
- Card Aspect Ratio: 4:5 vertical.
- Visuals: Photo takes ~70% of card height.
- Content: Overlay 5-star rating on image/bottom, verified badge, and truncated review text.
- Interaction: Full-screen lightbox with product details and Add to Cart.
- Spacing: 12px grid gap, safe bottom padding for sticky bar.

## Technical Details

### 1. Components
- **ProductReviews.tsx**: Update to support `grid-cols-2` on mobile and implement the 4:5 vertical card layout.
- **ReviewCard (Internal)**: New sub-component for the photo-centric card with text truncation and badge styling.
- **ReviewModal (Internal)**: Enhanced `DialogContent` to include product variant info and a primary "ADD TO CART" action.

### 2. Styling (Tailwind v4)
- Use `aspect-[4/5]` for card containers.
- Apply `line-clamp-2` for review text truncation.
- Use `backdrop-blur` and gradients for text overlays on images to ensure readability.
- Implement responsive grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`.

### 3. Data Flow
- Leverage existing `useReviewSummary` hook.
- Ensure the lightbox modal receives `selectedVariant` context from the parent product page to populate the "Add to Cart" button.

## Considerations
- **Image Protection**: Maintain existing anti-theft overlays and `onContextMenu` guards on all review photos.
- **Performance**: Use native `loading="lazy"` for grid images.
- **Empty State**: Keep the existing "Write a Review" CTA when no reviews exist.
