# Shorten the shipping-info validation message

## Problem
When required checkout fields are missing, the validation toast is shown for 5 seconds, which feels too long.

## Change
In `src/components/pages/Checkout.tsx`, inside the pay handler's validation branch:
- Reduce the toast duration from 5000 ms to 3500 ms (within the requested 3-4 second window).
- Leave the message text, the field error highlighting, and the auto-scroll to the first invalid field exactly as they are.

No other behavior or copy changes.

## Validation
On `/checkout`, submit with empty required fields and confirm the message appears and dismisses itself after about 3.5 seconds while the field errors remain visible.
