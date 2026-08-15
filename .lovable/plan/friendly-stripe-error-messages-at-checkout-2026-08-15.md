# Friendly Stripe error messages at checkout

Right now, when the payment session cannot be created, the shopper sees the raw Stripe text plus technical details appended in parentheses (error type, code, decline code, parameter name, request ID), rendered as "No pudimos cargar la pasarela de pago: ...". Card declines and configuration problems all look the same, and the technical noise is visible to the customer.

## What changes for the shopper

- Clear, short message in Spanish that says what happened and what to do next, with no error codes, parameter names, or request IDs on screen.
- Distinct messages per situation:
  - Card declined / insufficient funds / expired card / wrong security code -> suggest another card or payment method.
  - Invalid or incomplete data (email, address, phone, amount) -> point back to the form field group to correct.
  - Rate limit, network, or Stripe outage -> "temporary issue, try again in a moment" with the retry button.
  - Gateway not configured / account issue -> generic apology + contact us (no internals leaked).
- The existing "Intentar de nuevo" retry stays, plus a secondary way back to the form to fix data when the cause is a validation problem.
- The empty-session case ("Stripe no devolvió una sesión de pago") also gets a friendly message instead of the internal sentence.

## Technical notes

- `src/lib/stripe.server.ts` -> `getStripeErrorMessage`: stop concatenating `type/code/decline_code/param/requestId` into the returned string. Log the full raw detail with `console.error` server-side (so debugging is unaffected), and return a mapped customer-safe message based on `code`/`decline_code`/`type`. Add a small map for the common codes: `card_declined`, `insufficient_funds`, `expired_card`, `incorrect_cvc`, `processing_error`, `rate_limit`, `amount_too_small`, `invalid_request_error`, `api_connection_error`, `authentication_error`, `account_invalid`. Also move the `StripeError` branch above the generic object branch so it is reachable.
- Return a structured result instead of a bare string: `{ message, kind }` where `kind` is `card | data | temporary | config`. Keep a string-compatible export if other callers rely on it.
- `src/utils/payments.functions.ts`: pass the structured error through in the `{ error }` payload (add an optional `errorKind`), keeping the current response shape backward compatible.
- `src/components/StripeCartCheckout.tsx`: hold `{ message, kind }` in state, drop the "No pudimos cargar la pasarela de pago:" prefix in favour of the mapped message, and vary the actions by `kind` (retry for `temporary`/`card`, "revisar mis datos" for `data`, contact note for `config`).
- No changes to pricing, order creation, Shopify/SUP sync, or the Stripe session parameters.
