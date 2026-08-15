# Fix: checkout rejects payment even when all fields are filled

## What's happening

Validation requires a **State/Province** for United States and Canada
(`src/lib/checkout/customer.ts`, `PROVINCE_REQUIRED`), but the checkout form
(`src/components/pages/Checkout.tsx`) renders only email, first/last name,
address 1 and 2, postal code, city, country and phone — there is **no state/province
input at all**. A US or CA shopper can therefore never satisfy validation: pressing
Pay always shows "Correo, nombre, dirección, ciudad y teléfono son obligatorios",
with no visible field to correct, because the generic toast never names the real
blocking field.

Secondary contributors to the same dead end:
- The toast lists a fixed set of fields instead of the field that actually failed.
- The auto-scroll targets `document.getElementsByName(field)`, which finds nothing
  when the failing field has no rendered input.

## The fix

1. **Add the missing State/Province field** to the shipping section of the checkout
   form, next to city, following the existing input styling, error display and
   `updateCustomer` pattern. Mark it required only for the countries that need it
   (US, CA) and keep it optional elsewhere.
2. **Make the error message name the real problem.** Replace the fixed description
   with the actual failing-field messages returned by `validateCustomer`, so the
   shopper reads e.g. "Enter state (e.g. FL)" instead of a generic list.
3. **Fix the scroll-to-error fallback** so it focuses a rendered field when one
   exists and does nothing harmful when it doesn't.
4. Keep postal-code autofill behavior: when the postal lookup returns a state for
   US/CA, prefill the new field so most shoppers never type it.

No changes to pricing, Stripe, Shopify sync, or server-side validation contracts.

## Validation

Load `/checkout` with a US address in the preview, confirm the state field appears,
that a filled form no longer triggers the error toast, and that leaving the state
empty for US shows a specific inline message on that field.
