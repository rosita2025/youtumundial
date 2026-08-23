# Plan - Checkout & SKU Localization and Redirect Updates

Implement critical English localization for Stripe errors, refine postal code validation messages, and update product redirection logic to handle short SKUs efficiently.

## Proposed Changes

### Localization & Security
- **Stripe Server Logic (`src/lib/stripe.server.ts`)**: Update `TEMPORARY_MESSAGE` and generic error responses to match the strict wording required by Stripe for high-conversion checkouts ("Payment is not available at this moment. Please wait a few seconds and try again.").
- **Checkout Validation (`src/lib/checkout/customer.ts`)**: Refine `POSTAL_RULES` error messages to be more user-friendly in English (e.g., "US ZIP must be 5 digits (e.g. 90210).").

### Routing & Performance
- **Product SKU Redirects (`src/routes/products.$sku.tsx`)**: Simplify SKU handling. Ensure redirects to the main product slug are clean and do not append unnecessary variant parameters when not explicitly needed, as requested by Stripe SKU compliance.
- **Search Optimization (`src/lib/data/data-provider.ts`)**: Ensure `getProductBySku` uses strict normalization to avoid long-tail SKU mismatches that cause "Page not working" errors during high-load syncs.

### UI Polish
- **Product Detail (`src/components/pages/ProductDetail.tsx`)**: Verify that variant selection doesn't reload the page but updates the URL state correctly for SEO and direct SKU links.

## Technical Details
- Using Zod for strict field validation in `customer.ts`.
- TanStack Router `redirect` in `products.$sku.tsx` for server-side SEO-friendly routing.
- Stripe Node.js library for server-side error handling in `stripe.server.ts`.
