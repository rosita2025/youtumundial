# Plan: Apply requested text edits

Apply the specific text replacements requested by the user across multiple components and routes to ensure consistent messaging.

## User-facing changes

- Update the **Announcement Bar** messages to replace the request text.
- Refine the **Footer** brand description.
- Modify the **Instagram Feed** follow button text.
- Update **Checkout** summary titles and payment trust badges.
- Standardize intro text on **Static Pages** (About, Privacy, Terms, Shipping, Contact, Disclaimer).
- Localize status messages on the **Order Success (Return)** page.

## Technical details

- Modify `src/components/layout/AnnouncementBar.tsx`: Replace "Read the attached request document and follow its mode rules." with "New arrivals synced automatically from our store".
- Modify `src/components/layout/Footer.tsx`: Update the brand description to be more concise and accurate.
- Modify `src/components/home/InstagramFeed.tsx`: Change "Follow us on Instagram" to "Shop the Look".
- Modify `src/components/product/ProductTrustStrip.tsx` and `src/components/product/StickyAddToCart.tsx`: Update trust labels.
- Modify `src/components/pages/Checkout.tsx`: Update titles like "Order Summary" and "Express Checkout".
- Modify `src/routes/checkout_.return.tsx`: Update status and sync messages.
- Batch edits to `src/routes/about.tsx`, `src/routes/privacy.tsx`, `src/routes/terms.tsx`, `src/routes/shipping.tsx`, `src/routes/contact.tsx`, and `src/routes/disclaimer.tsx`.

## Invariants

- Preserve all imports and Zod validators.
- Maintain existing logic for Shopify/SUP sync.
- Ensure all meta tags in `head()` remain unique and descriptive.
- Keep Tailwind CSS v4 styling patterns.
