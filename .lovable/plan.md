# Plan: Implement Shipping Estimator and Fixed Delivery Terms in Checkout

The user wants to add a shipping estimator to the checkout page so customers can see the cost and timeframe before confirming. They also specified a fixed timeframe: 3-4 days for preparation and 10-15 days for shipping.

## Proposed Changes

### Configuration Update
- Update `src/lib/checkout/config.ts` to reflect the new global shipping timeframe (10-15 days) for all regions except specific exceptions like Singapore.

### UI Components
- Modify `src/components/pages/Checkout.tsx` to include a clear "Shipping & Delivery" section before the payment buttons.
- This section will display:
    - Estimated preparation time: 3-4 business days.
    - Estimated shipping time: 10-15 business days (or based on the selected country).
    - Calculated shipping cost.

### Logic Integration
- The checkout already calculates shipping based on the selected country. I will enhance the visibility of this information so it acts as the requested "estimator" before the final confirmation.
- Add a specific visual callout for the "Preparation Time" which was explicitly requested.

## Technical Details
- Ensure the `shippingQuote` logic in `Checkout.tsx` remains the source of truth for cost.
- Add a dedicated info block in the left column (Shipping Info) or above the payment summary that details the 3-4 day prep + 10-15 day shipping breakdown.
