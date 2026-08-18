# Plan - Image Anti-Theft Protection

Implement comprehensive anti-theft protection for all remaining product-related images to prevent unauthorized downloading and reuse.

## Proposed Changes

### 1. Global Image Protection Policy
- Apply right-click prevention (`onContextMenu`) and drag protection (`draggable={false}`) to all visual assets.
- Use transparent overlay blockers to prevent "Save Image As" functionality on desktop.

### 2. Product Components
- **ProductCard.tsx**: Add overlays and event blockers to collection/search grid images.
- **ProductDetail.tsx**: Secure the main hero and benefit images.
- **VariantSelector.tsx**: Secure the visual color swatches.
- **UpsellSection.tsx**: Secure recommended product thumbnails.

### 3. Review & UGC Protection
- **ProductReviews.tsx**: Update the "Customer Gallery" grid and the enlarged preview modal to ensure consistent right-click blocking.

## Technical Details
- CSS: Use `pointer-events-none` on images with a sibling `absolute inset-0` div to capture events.
- React: Add `onContextMenu={(e) => e.preventDefault()}` to both the image and the overlay.
- Watermarks: Ensure `@youtumundial` text remains visible on all user-submitted photos.

## Verification Plan
- Manually test right-click behavior on product grids, detail pages, and review photos.
- Verify that mobile "long-press to save" is mitigated by transparent overlays.
