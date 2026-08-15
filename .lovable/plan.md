---
name: Checkout Authentication and Coming Soon
description: Plan to implement a "Coming Soon" placeholder for the login link in the checkout, matching the user's request to hide technical guards and handle the missing auth route.
type: feature
---

## Context
The user wants to add "Coming soon" to the "Already have an account? Log in" link in the checkout page. Currently, the store does not have an active `/auth` route for customers, and the user previously requested to hide technical guards.

## Proposed Changes

### Checkout Page
- Modify `src/components/pages/Checkout.tsx` to update the "Contact" section.
- Change the login link text to include a "Coming soon" note or wrap it in a way that indicates it's not yet available.
- Specifically, the request says: "pero poner commin soon ese already have an coount? logi in por favor ese chekcout".
- I will change the link to: `Already have an account? Log in (Coming soon)`.
- I will also disable the link or point it to a `javascript:void(0)` to prevent 404s until the auth system is ready.

## Technical Details
- File: `src/components/pages/Checkout.tsx`
- Location: Line ~238.
- Edit: Replace `<Link to="/auth" ...>Already have an account? Log in</Link>` with a version that includes "(Coming soon)".
