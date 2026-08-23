# Plan: Remove "Men" from Footer

The user wants to remove the "Men" link/category from the footer menu as the store is focused on women's clothing.

## Changes

### Footer
- Edit `src/components/layout/Footer.tsx` to remove the "Men" entry from the `footerLinks.shop` array.

## Technical Details
- File to modify: `src/components/layout/Footer.tsx`
- Action: Remove the object `{ label: 'Men', href: '/collections/mens' }` from the `shop` array within `footerLinks`.
