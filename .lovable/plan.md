# Plan - Horizontal Product Layout for Improved UX

Address the user's feedback about vertical scrolling being too long by implementing a horizontal layout option for product lists, especially on mobile, while maintaining the overall design integrity.

## User Preferences
- **Horizontal Display**: Prevent excessive vertical scrolling by making products appear horizontally where appropriate ("el produtcos he visto horizontal por evitar scroll se ve largo").
- **Preserve Branding**: Maintain the current English-focused branding and high-conversion elements.

## Proposed Changes

### 1. Horizontal Scroll for Home Sections
- Update `TrendingProducts.tsx` to use a horizontal scrollable container on mobile devices (instead of a single-column grid).
- Ensure the "View All" button remains accessible.
- Maintain the `grid` layout on desktop for a clean look.

### 2. Product Grid Optimization
- In `ProductGrid.tsx` and `Products.tsx`, consider if a more compact grid (e.g., 2 columns on small mobile) is better than a full vertical stack if horizontal scroll isn't preferred for the main catalog.
- However, the user specifically mentioned "horizontal" to avoid "long" scrolling, which strongly implies a `flex-row` with `overflow-x-auto`.

### 3. Collection Cards
- Apply similar logic to `FeaturedCollections.tsx` if it also contributes to the "long scroll" feel.

## Technical Details
- **CSS**: Use Tailwind's `flex`, `overflow-x-auto`, and `snap-x` utilities for a native-feeling horizontal scroll experience.
- **Responsiveness**: Use `sm:grid` to revert to standard grids on larger screens.

## Next Steps
- Implement horizontal scrolling for `TrendingProducts` on mobile.
- Implement horizontal scrolling for `FeaturedCollections` on mobile.
- Verify the layout on mobile and desktop viewports.
