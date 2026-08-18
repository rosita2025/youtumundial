# Plan: Protect Testimonial Images from Theft

Protecting customer review images and product gallery images from being easily downloaded or stolen by disabling right-click, dragging, and adding transparent overlays.

## Proposed Changes

### Components

#### [src/components/product/ProductReviews.tsx](src/components/product/ProductReviews.tsx)
- Add `onContextMenu={(e) => e.preventDefault()}` and `draggable={false}` to all review images (thumbnails and modal view).
- Add a transparent overlay `div` over the images to prevent direct interaction with the image file.
- Ensure the `@youtumundial` watermark is always above the image in the layer stack.
- Apply `select-none` class to images.

#### [src/components/product/ProductGallery.tsx](src/components/product/ProductGallery.tsx)
- Add the same protection (prevent context menu, drag, and add transparent overlay) to the main product image and thumbnails.
- This prevents general image theft from the store.

#### [src/components/product/StickyAddToCart.tsx](src/components/product/StickyAddToCart.tsx)
- Apply basic protection (no context menu, no drag) to the small product thumbnail in the sticky bar.

## Technical Details
- **Right-click prevention**: Using React's `onContextMenu` event to block the browser's default context menu.
- **Drag prevention**: Using the `draggable={false}` attribute.
- **Visual barrier**: A `div` with `absolute inset-0 bg-transparent` placed over the image ensures that any click or right-click interaction hits the div instead of the `<img>` tag itself.
- **Select prevention**: Using Tailwind's `select-none` utility class.

## Verification Plan
- **Manual Verification**:
    - Navigate to a product page with reviews (e.g., the Lion Bag).
    - Try to right-click on review photos: the context menu should not appear.
    - Try to drag a review photo: it should not be draggable.
    - Verify that clicking the photo still opens the zoom modal.
    - Verify that the zoom modal images are also protected.
- **Product Gallery**:
    - Verify that main product images are also protected from right-clicking and dragging.
