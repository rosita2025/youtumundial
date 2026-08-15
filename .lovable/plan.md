# Plan - Regional Shipping Rates Update

Update the checkout shipping configuration to use region-specific rates as requested by the user, replacing the current Shopify-market-based fallbacks.

## User Requirements
- Latin America: $8.00 USD
- English-speaking (Angloparlante): $5.00 USD
- Europe: $6.00 USD
- Asia: $5.00 USD
- Africa: $5.00 USD
- Default (Global): $11.90 is currently too high.

## Technical Details
- Modify `src/lib/checkout/config.ts` to implement a new `regionForCountry` helper.
- Map ISO country codes from `src/lib/checkout/countries.ts` to their respective regions.
- Update `shippingCountries` mapping logic to use these regional rates.
- Update `shippingMarkets` to reflect the new default fallbacks for the "INTL" market based on the user's preferences.

## Implementation Steps

### 1. Define Regions
Map countries to regions in `src/lib/checkout/config.ts`:
- **LATAM**: AR, BO, BR, CL, CO, CR, CU, DO, EC, SV, GT, HN, MX, NI, PA, PY, PE, PR, UY, VE.
- **ENGLISH**: US, CA, GB, AU, NZ, IE.
- **EUROPE**: DE, FR, IT, ES, PT, NL, BE, CH, AT, SE, NO, FI, DK, PL, etc.
- **ASIA**: JP, CN, KR, SG, MY, TH, ID, PH, VN, etc.
- **AFRICA**: ZA, NG, KE, EG, MA, etc.

### 2. Update Shipping Logic
- Update `shippingCountryFor` and `shippingCountries` to use a dynamic rate based on the country's region.
- Set default fallback rates in `shippingMarkets` to align with the new regional structure.

### 3. Verification
- Verify that selecting a country from Latin America (e.g., Peru) shows $8.00.
- Verify that selecting a country from Europe (e.g., Spain) shows $6.00.
- Verify that English-speaking countries (e.g., USA) show $5.00.
