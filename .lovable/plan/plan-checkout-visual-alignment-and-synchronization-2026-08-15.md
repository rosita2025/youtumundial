# Plan - Checkout Visual Alignment and Synchronization

The goal is to refine the checkout experience to perfectly match the Shopify model, ensuring visual consistency and fixing potential synchronization issues mentioned by the user.

## Proposed Changes

### Checkout UI & Flow
- **Visual Polish**: Adjust `src/components/pages/Checkout.tsx` and `src/components/checkout/CheckoutShell.tsx` to more closely mimic the Shopify checkout layout (multi-column, sidebar for summary, clean inputs).
- **Express Checkout**: Ensure `ExpressPayButtons` and `StripeCartCheckout` are seamlessly integrated, appearing exactly where they would in a Shopify store.
- **Header/Footer**: Verify `CheckoutShell` completely hides site navigation to prevent funnel leaks.

### Data Synchronization
- **Customer Sync**: Ensure email capture triggers `upsertShopifyCustomer` and starts the abandoned checkout sync immediately.
- **Order Sync**: Verify that successful Stripe payments correctly convert draft orders and notify the admin/SUP for fulfillment.

### Global Shipping & Pricing
- **Validation**: Refine address validation in `src/lib/checkout/customer.ts` to be less intrusive but still accurate for international shipping.
- **Singapore Highlights**: Ensure the "Free Singapore Delivery" message is prominent throughout the checkout process.

## Technical Details
- **Components**: `Checkout.tsx`, `CheckoutShell.tsx`, `ExpressPayButtons.tsx`.
- **Logic**: `customer.ts` (validation), `shopify/customers.server.ts` (sync).
- **Styling**: Tailwind CSS v4 using semantic tokens for a clean, Shopify-like appearance.

## Verification Plan
- **Manual Test**: Perform a test purchase to verify the checkout layout and flow.
- **Sync Check**: Check Shopify admin for draft order creation upon email entry.
- **Validation Check**: Test various international addresses to ensure validation works as expected without being a blocker.
