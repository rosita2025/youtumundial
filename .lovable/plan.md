# Fix: Google Pay express button not showing

## Problem
The express pay section only renders the Google Pay button when Stripe's `paymentRequest.canMakePayment()` reports `googlePay: true`. That check fails in most contexts (preview iframe, browsers without a saved Google Pay card, missing wallet domain), so the button is hidden and shoppers only see the "Available on supported browsers & devices" note. Since pressing express simply opens the Stripe payment page (where Google Pay and Link are actually offered), gating on the browser check is unnecessary.

## Change
In `src/components/checkout/ExpressPayButtons.tsx`:
- Always show the Google Pay button when Stripe is configured, instead of requiring `canMakePayment()`.
- Keep Apple Pay conditional on the wallet check (Apple only renders on Apple devices) but still show it when detected.
- Remove the fallback placeholder note when Google Pay is shown; keep the "express not available" message only when Stripe is not configured.
- Keep the loading skeleton short-lived so the buttons never depend on a slow wallet probe.
- No changes to the payment flow: the button continues to call `onPay()`, which opens the Stripe checkout used today.

## Validation
Load `/checkout`, confirm the black Google Pay button renders next to Link, and confirm clicking it opens the Stripe payment step.
