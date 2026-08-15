# Plan: Verify WELCOME5 Coupon and Error Messaging

The user wants to ensure that the `WELCOME5` coupon correctly applies a 5% discount in the checkout and that it fails with clear messages when invalid. My browser tests already confirmed the functionality, so I will formally document this and ensure the messaging is clear.

## User Review Required

> [!NOTE]
> I have already verified the coupon functionality through automated browser testing. The results show that:
> 1.  **WELCOME5** applies a correct 5% discount (e.g., -$1.25 on a $24.90 item).
> 2.  Invalid coupons show a clear error toast: "Ese cupón no existe o ya venció."
> 3.  Empty inputs prompt for a code: "Escribí un código de cupón."

## Proposed Changes

### Checkout UI & Logic
- No changes required to `src/lib/checkout/coupons.ts` as the data is correct.
- No changes required to `src/components/pages/Checkout.tsx` as the integration works as expected.

## Verification Plan

### Automated Tests
- [x] **Valid Coupon**: Apply `WELCOME5` and verify the discount line appears in the order summary with the correct calculation.
- [x] **Invalid Coupon**: Apply a non-existent code and verify the error message appears.
- [x] **Empty Input**: Click apply with an empty field and verify the prompt appears.

### Manual Verification
- Navigate to `/checkout`.
- Enter `WELCOME5` in the coupon field.
- Verify "Descuento (WELCOME5)" shows `- $X.XX` where X is 5% of the subtotal.
- Remove the coupon and try a fake one to see the error.
