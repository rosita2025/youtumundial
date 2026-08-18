---
name: Mobile Horizontal Scroll Fix
description: Fix horizontal scroll issues on mobile devices by ensuring proper overflow handling and component containment.
type: feature
---

# Plan - Mobile Horizontal Scroll Fix

The goal is to eliminate unwanted horizontal scrolling on mobile devices, which is often caused by negative margins, absolute positioning, or fixed-width elements exceeding the viewport.

## User Review Required

> [!IMPORTANT]
> I have identified two main areas potentially causing horizontal scroll on mobile:
> 1. **Horizontal Scroll Lists**: Featured Collections and Trending Products use negative margins (`-mx-4`) to bleed to the edges, which requires careful containment.
> 2. **Overflow Handling**: The root `Layout` or global styles might need `overflow-x-hidden` to prevent sub-pixel rounding or animation artifacts from triggering a scrollbar.

## Proposed Changes

### 1. Global Layout & Styles
- Add `overflow-x-hidden` to the main application wrapper or `body` to ensure no stray elements can force a horizontal scroll.
- Ensure the `Layout` component's `main` container is properly constrained.

### 2. Horizontal Scroll Containers
- **TrendingProducts.tsx**: Review the `-mx-4 px-4` pattern. While standard for "bleeding" lists, it needs a parent with `overflow-hidden` if the content slightly overflows.
- **FeaturedCollections.tsx**: Similar review for the collection grid scroll.

### 3. Review Component (UGC Grid)
- **ProductReviews.tsx**: Ensure the 2-column grid and any overlays do not exceed the `container-wide` padding on small screens.

### 4. Header & Footer
- Verify that the Header's search input and mobile menu transitions do not temporarily expand the body width.

## Technical Details

- **Files to modify**:
  - `src/components/layout/Layout.tsx`: Add defensive `overflow-x-hidden`.
  - `src/components/home/TrendingProducts.tsx`: Wrap the scroll container if necessary.
  - `src/components/home/FeaturedCollections.tsx`: Wrap the scroll container if necessary.
  - `src/styles.css`: Add a global utility for mobile overflow prevention if needed.

- **Verification**:
  - Use mobile emulation in the preview.
  - Test transitions (mobile menu, search toggle).
  - Check "New Arrivals" and "Trending Now" sections specifically.
