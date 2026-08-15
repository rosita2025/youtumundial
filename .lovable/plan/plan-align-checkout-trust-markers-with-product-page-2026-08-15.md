# Plan: Align Checkout Trust Markers with Product Page

This plan updates the Checkout page to include the same high-conversion trust markers and features recently added to the Product Detail page, ensuring a consistent and persuasive shopping experience until the final step.

## Proposed Changes

### 1. Update `Checkout.tsx` Sidebar
- **Add Trust Markers**: Insert a new section below the order total or in the footer of the order summary sidebar.
- **Markers to Include**:
    - **Free Singapore Delivery**: Highlighting "No min. spend".
    - **7-Day Returns**: Highlighting "Love it or Your Money Back!".
    - **Premium Quality**: Highlighting "Built-In Comfort".
- **Visual Consistency**: Use the same icons (`Truck`, `RotateCcw`, `Heart`, `Gem`) and colors from `lucide-react`.

### 2. Refine `CheckoutShell.tsx` (Optional but Recommended)
- Ensure the "Secure Checkout" lock icon is prominent.
- Verify that the footer links (Privacy, Terms, Shipping) match the new site-wide English localization.

## Technical Details
- **File**: `src/components/pages/Checkout.tsx`
- **Component**: Update the `aside` (sidebar) element.
- **Icons**: Import `Truck`, `RotateCcw`, `Heart`, `Gem` from `lucide-react`.

## Steps
1. Modify `src/components/pages/Checkout.tsx` to include the trust marker block in the sidebar.
2. Ensure the text matches the specific phrases requested previously ("Free Singapore delivery", "Easy Returns", etc.).
3. Verify the visual layout in the preview.
