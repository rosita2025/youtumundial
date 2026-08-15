# Plan - Auto-hide Order Summary on Scroll (Mobile)

Improve the mobile checkout experience by automatically hiding the expanded order summary when the user scrolls down to fill in their details. This mimics standard Shopify behavior where the summary is a sticky header but doesn't obstruct the form while filling it out.

## User Review Required

> [!IMPORTANT]
> This change will only affect the **mobile** view where the "Show order summary" toggle is present.

- The order summary will automatically collapse if it is open and the user scrolls down more than 100 pixels.
- This prevents the summary from taking up screen space while the customer is typing their shipping address and payment details.

## Proposed Changes

### Checkout Page (`src/components/pages/Checkout.tsx`)

- Add a scroll event listener that monitors the vertical scroll position.
- If `showOrderSummary` is true and `window.scrollY > 100`, set `showOrderSummary` to false.
- Ensure the event listener is properly cleaned up on unmount.

## Technical Details

- **Hook**: Use `useEffect` with a scroll event listener.
- **Threshold**: Set a threshold (e.g., 100px) to trigger the collapse.
- **State management**: Directly update `setShowOrderSummary(false)` when scrolling down.
- **Cleanup**: Remove the listener in the `useEffect` return function to prevent memory leaks or unexpected behavior on other pages.

## Verification Plan

### Automated Tests
- N/A (Manual visual verification is more reliable for scroll behavior).

### Manual Verification
1. Open the preview in mobile view (viewport width < 1024px).
2. Add items to the cart and go to `/checkout`.
3. Click "Show order summary" to expand it.
4. Scroll down towards the "Contact" or "Delivery" sections.
5. Verify that the order summary collapses automatically.
6. Verify that clicking "Show order summary" again works as expected.
