# Plan - Product FAQ Section

Add a high-converting, responsive FAQ accordion section to the product page to address common customer concerns and improve conversion rates.

## User Review

> **User Focus:** Clean, responsive UI with specific styling (#EAE6DF border, 8px radius, #FBF9F5 bg) and single-item expansion.

- [ ] Create `ProductFAQ` component in `src/components/product/ProductFAQ.tsx`.
- [ ] Implement accordion logic using shadcn/ui components (`Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`).
- [ ] Apply custom styles:
    - Title: "Frequently Asked Questions", 22px bold, centered, color #111111.
    - Container: Soft off-white background (#FBF9F5).
    - Items: Rounded corners (8px), padding (16px), beige outline (#EAE6DF).
    - Icons: Custom toggle arrows (▲ / ▼).
- [ ] Populate with the 5 requested FAQ items (Product design, Safety, Shipping, Returns, Care).
- [ ] Integrate `ProductFAQ` into `src/components/pages/ProductDetail.tsx` directly above the `Footer`.

## Technical Details

- Use `@radix-ui/react-accordion` (via `src/components/ui/accordion.tsx`) with `type="single"` and `collapsible`.
- Use Tailwind for custom styling and colors.
- Ensure 80px bottom padding for compatibility with the Sticky Add to Cart bar.
