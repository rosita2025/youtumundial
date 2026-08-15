# Plan to Fix and Verify Shipping Checkout Rates

The user requested specific regional shipping rates ($8.00 for LATAM, $5.00 for Anglosphere, $6.00 for Europe, etc.). While these were updated in the frontend config, the server-side fallback logic still uses hardcoded market rates which creates inconsistencies when Shopify is not responding or not configured for certain regions.

## Proposed Changes

### 1. Unified Shipping Fallback
- Modify `src/lib/checkout/shipping.server.ts` to use `getRegionalShippingRate(countryCode)` inside `fallbackQuote`.
- This ensures that if Shopify fails to provide a rate, the server returns the exact regional rate defined in `config.ts` instead of the generic $6.00 international fallback.

### 2. Config Consistency
- Ensure `shippingMarkets` in `src/lib/checkout/config.ts` reflects the user's primary market expectations where applicable (though `getRegionalShippingRate` is now the source of truth).

## Technical Details

### `src/lib/checkout/shipping.server.ts`
Update `fallbackQuote` to:
```typescript
function fallbackQuote(countryCode: string): ShippingQuote {
  const market = marketForCountry(countryCode);
  const { getRegionalShippingRate } = await import('./config'); // Dynamic import if needed or import at top
  return {
    countryCode: countryCode.toUpperCase().slice(0, 2),
    amount: getRegionalShippingRate(countryCode),
    currencyCode: 'USD',
    title: `${market.name} · ${market.service}`,
    fromShopify: false,
  };
}
```

## Validation Plan
1. **Manual Verification**: Navigate to the checkout page, add a product to the cart, and change the country to various regions (Peru, Mexico, USA, Spain, Japan, Egypt).
2. **Automated Check**: Use `execute_preview_javascript` to verify that the "Shipping" row in the order summary matches the expected regional rate for each selected country.
3. **Server-Side Check**: If possible, trigger a mock order pricing to ensure the server-side calculation matches the UI.
