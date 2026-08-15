# Plan - Sticky Promotional Banner and Welcome Coupon

Add a sticky promotional banner at the top of the site with free shipping information and a "WELCOME5" coupon code for first orders.

## User-facing changes
- **Promotional Banner**: A new sticky green banner at the top of every page.
- **Message**: "Enjoy 5% off for your first order. Use code **WELCOME5** | Free shipping on orders over $45 worldwide"
- **New Coupon**: Customers can now use the code "WELCOME5" during checkout to get a 5% discount.

## Technical details
- **New Component**: Create `src/components/layout/AnnouncementBar.tsx` for the promotional banner.
- **Layout Integration**: Update `src/components/layout/Layout.tsx` to include the banner above the header.
- **Coupon Logic**: Update `src/lib/checkout/coupons.ts` to add the `WELCOME5` coupon (5% off).
- **Styling**: Use a sticky layout and high-contrast green background for the banner to improve conversion visibility.

## Progress
- [ ] Create `AnnouncementBar.tsx`
- [ ] Add `WELCOME5` to `coupons.ts`
- [ ] Integrate into `Layout.tsx`
