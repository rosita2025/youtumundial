# Plan - Update Header Navigation

Update the header navigation menu to match the requested links and order. The new menu will include: Home, Products, Women (Only Women), New Arrivals, Sale, and Contact.

## User Review Required

> [!IMPORTANT]
> The "Men" category will be removed to accommodate the "Only Women" request. Is this correct?

- **Menu order**: Home, Products, Women, New Arrivals, Sale, Contact.
- **Labels**: "Home", "Products", "Women", "New Arrivals", "Sale", "Contact".

## Proposed Changes

### Navigation

#### [Header](src/components/layout/Header.tsx)
- Update `navLinks` array to include the new labels and links in the specified order.
- Change labels to English as requested.
- Remove "Men" and add "Home" and "Contact".

## Technical Details

- Update `navLinks` constant in `src/components/layout/Header.tsx`.
- Map the links as follows:
  - Home -> `/`
  - Products -> `/products`
  - Women -> `/collections/womens`
  - New Arrivals -> `/collections/new-arrivals`
  - Sale -> `/collections/sale`
  - Contact -> `/contact`
