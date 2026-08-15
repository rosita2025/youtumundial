# Plan - Fix Stripe Checkout Validation and Errors

The user is reporting "stripe no se puede comprar" (Stripe cannot be bought/used). Based on recent history, we've implemented strict validation in `Checkout.tsx` and `payments.functions.ts`. I need to ensure the feedback loop for these errors is clear and that the environment configuration is correct for their specific Stripe account.

## Proposed Changes

### 1. Checkout UI Enhancements
- Improve error messaging in `Checkout.tsx` when Stripe fails to load or when validation fails.
- Ensure the "Pay" button shows a loading state clearly while generating the Stripe session.
- Add a manual "Retry" mechanism if `StripeCartCheckout` fails to mount due to a network error.

### 2. Validation & Security
- Sync `Checkout.tsx` validation logic with `payments.functions.ts` to prevent "silent" failures where the frontend thinks it's okay but the server rejects it.
- Ensure the phone number prefix logic is robust for all supported countries.

### 3. Debugging Support
- Add localized logging (server-side) for Stripe initialization errors to help identify if the issue is with the `STRIPE_LIVE_API_KEY` or `VITE_PAYMENTS_CLIENT_TOKEN`.

## Technical Details
- Update `src/components/pages/Checkout.tsx` to handle `createCartCheckout` errors explicitly before showing the Stripe component.
- Verify `src/lib/stripe.server.ts` handles common Stripe account errors (like "Account not active") and returns user-friendly messages.

## Verification Plan
- Use Playwright to simulate a checkout flow and verify that missing fields trigger validation.
- Verify that if a server-side error occurs (e.g., invalid API key), a clear toast message is shown instead of a broken UI.
