# Plan - Checkout Visual and Payment Provider Enhancements

The user wants to improve the checkout page by ensuring all payment methods (Google Pay, Apple Pay, PayPal, Mastercard, Visa) are clearly visible and available globally. They also mentioned missing "badges" and requested the checkout to better match their model.

## User Requirements
1.  **Payment Methods**: Ensure Google Pay, Apple Pay, PayPal, Mastercard, and Visa are available and visible.
2.  **Global Availability**: Confirm and ensure all countries are supported for these payments.
3.  **Visual "Badges"**: Add missing trust/payment badges.
4.  **Checkout Model**: Refine the checkout UI to match the Shopify/Express style more closely.

## Technical Details
- **Stripe Integration**: Google Pay and Apple Pay availability depends on Stripe's `canMakePayment()`. We need to ensure the `ExpressPayButtons` component correctly handles these and that the `StripeCartCheckout` (Embedded Checkout) is configured to support them.
- **PayPal**: Currently, there's a PayPal logo in `ExpressPayButtons` but no active PayPal button. I will add a functional PayPal button or ensure it's integrated via Stripe if supported by the user's account.
- **Country Support**: The `shippingCountries` list in `src/lib/checkout/config.ts` already covers 250+ countries. I will ensure the payment logic doesn't unnecessarily restrict these.
- **Trust Badges**: Add high-quality SVG badges for Visa, Mastercard, PayPal, Apple Pay, and Google Pay in the checkout summary and footer.

## Proposed Changes

### 1. Checkout UI Enhancements
- **File**: `src/components/pages/Checkout.tsx`
    - Refine the "Express Checkout" section to be more prominent.
    - Add a specialized "Payment Methods" badge row in the sidebar summary.
    - Improve the "distraction-free" layout consistency.

### 2. Payment Buttons Expansion
- **File**: `src/components/checkout/ExpressPayButtons.tsx`
    - Add a dedicated PayPal button (using a standard button style for now, or integrating Stripe's PayPal if enabled).
    - Ensure Apple Pay and Google Pay labels and icons are crisp and follow brand guidelines.
    - Update the trust marker row at the bottom of the component to include all requested icons (Visa, Mastercard, PayPal, Apple Pay, Google Pay).

### 3. Country Localization
- **File**: `src/lib/checkout/countries.ts`
    - The names are currently in Spanish (e.g., "Afganistán"). I will translate them to English to match the store's international focus.

### 4. Configuration
- **File**: `src/lib/checkout/config.ts`
    - Ensure `shippingCountryFor` and market logic handle all edge cases correctly for global shipping.

## Validation Plan
1.  **Visual Check**: Verify the checkout page shows the express buttons and trust badges.
2.  **Responsive Check**: Ensure the mobile order summary and sticky elements look correct.
3.  **Payment Flow**: Verify (in test mode) that the payment buttons trigger the Stripe/Payment flow.
