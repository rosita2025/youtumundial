# Plan: IP-Based Phone Country Prefixing

Enable automatic phone number prefixing in the checkout based on the user's detected IP address/country to improve UX and data quality for international shipping.

## Proposed Changes

### Checkout Improvements

#### [Checkout Page] `src/components/pages/Checkout.tsx`
- Integrate a mapping of country codes to international dialing prefixes.
- Update the `detectVisitorGeo` effect to automatically set the `phone` field with the corresponding prefix (e.g., `+51 ` for Peru) if the field is empty.
- Ensure the phone input maintains the prefix if the user changes the country selector manually.

#### [Customer Utils] `src/lib/checkout/customer.ts`
- Add a helper function or constant `getDialingCode(countryCode: string)` to map ISO codes to prefixes.
- Refine `toE164` to handle cases where a user might accidentally duplicate the `+` sign.

## Technical Details

- **Geo Detection**: Use the existing `detectVisitorGeo` server function which already identifies the visitor's country.
- **Dialing Code Mapping**: Add a standard mapping for major supported countries (US: +1, PE: +51, MX: +52, etc.).
- **UX**: If a user selects a different country in the dropdown, the phone prefix should update automatically if they haven't typed a full number yet.

## User Review Required

> [!IMPORTANT]
> The auto-detection relies on IP address. If a user is using a VPN, it will detect the VPN's location. The user can always manually override the country and phone number.
