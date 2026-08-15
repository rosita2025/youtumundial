# Plan - Enable Google Pay in Checkout

The user wants to ensure Google Pay is available in the Stripe checkout and explicitly mentioned adding it. The current implementation already has a `GooglePayMark` and checks for its availability, but it might be restricted or not explicitly enabled in the Stripe Payment Request setup.

## Proposed Changes

### Stripe Configuration
- Update `ExpressPayButtons.tsx` to ensure the Stripe `paymentRequest` is correctly configured to support Google Pay.
- Verify that `requestPayerName` and `requestPayerEmail` are set (already present).
- Ensure the `country` and `currency` are correctly passed.

### UI Enhancements
- If Google Pay is detected as available by Stripe's `canMakePayment()`, it will show.
- The user mentioned "colcoary ggoogle pay conc elu" which likely means "place Google Pay with it" (referring to the express checkout area).
- I will ensure the Google Pay button is prominent when available.

### Verification Plan
- The `canMakePayment()` call is browser-dependent. I will verify the logic by checking if it correctly sets the state when `googlePay` is returned as true from Stripe.
- I will check the `ExpressPayButtons` logic to see if there are any hardcoded disables for Google Pay (currently there aren't, it just depends on `result.googlePay`).

## Technical details
- File: `src/components/checkout/ExpressPayButtons.tsx`
- Logic: `stripe.paymentRequest({ ... })` and `paymentRequest.canMakePayment()`
- Component: `ExpressPayButtons`
