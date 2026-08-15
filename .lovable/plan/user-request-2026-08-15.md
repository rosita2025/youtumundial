---
title: Enhance Checkout Layout and Payment Badges
description: Add comprehensive payment badges, show complete order summary (products, prices, shipping, taxes, total), and ensure Shopify-like behavior.
---

## User Request
The user wants to improve the checkout page to be more like Shopify. Key requirements:
- Add payment badges (Visa, etc.) to the checkout.
- Show the order summary including products, prices, shipping, taxes, and total.
- Ensure the overall layout and behavior matches Shopify's "Show order summary" experience.

## Proposed Changes

### 1. Payment Badges
- Add a comprehensive row of payment method icons (Visa, Mastercard, Amex, Discover, PayPal, Apple Pay, Google Pay) in the payment section of `src/components/pages/Checkout.tsx`.
- Ensure they are properly styled (e.g., small, clean, high-quality SVGs).

### 2. Order Summary Enhancement
- **Desktop**: Ensure the right sidebar clearly lists each product with its image, variant details, quantity badge, and price.
- **Mobile**: Improve the "Show order summary" toggle behavior to match Shopify's smooth accordion style, displaying the full item list and cost breakdown.
- **Calculations**: Explicitly show:
    - Subtotal
    - Discount (if applicable)
    - Shipping (with real-time calculation status)
    - Taxes (Estimated taxes line)
    - Total in USD (and PEN for Peruvian customers)

### 3. Layout Refinements
- Adjust padding and margins in `CheckoutShell.tsx` and `Checkout.tsx` to perfectly align with Shopify's minimalist aesthetic.
- Ensure the "Secure Checkout" lock icon and branding are prominent but not distracting.

## Technical Details
- **Files to Modify**:
    - `src/components/pages/Checkout.tsx`: Core logic for summary calculation and badge rendering.
    - `src/components/checkout/CheckoutShell.tsx`: Minor layout tweaks if necessary for the sticky summary/header.
- **Data Handling**:
    - Continue using `useCart` context for item data.
    - Update `totals` object to include a specific `tax` property (defaulting to 0 or a simple calculation if requested, otherwise "Calculated at next step").
- **Visuals**:
    - Use high-quality SVG URLs for payment logos.
    - Implement a clean cost breakdown table.
