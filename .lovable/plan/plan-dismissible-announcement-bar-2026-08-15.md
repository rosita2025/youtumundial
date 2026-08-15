# Plan - Dismissible Announcement Bar

Make the announcement bar dismissible and persist the user's preference in `localStorage` to avoid showing it again in future visits.

## User-facing changes
- **Dismiss Button**: A small "X" button on the right side of the announcement bar.
- **Persistence**: Once the user closes the banner, it will remain hidden across sessions.

## Technical details
- **State Management**: Use `localStorage` to store the dismissed state.
- **Layout Adjustments**: 
    - Add a close button to `AnnouncementBar.tsx`.
    - Handle conditional rendering based on persistence.
    - Update `Header.tsx` to dynamically adjust its `top` offset depending on whether the banner is visible (using a shared state or a CSS variable).
- **CSS Variable Strategy**: 
    - Set a `--announcement-bar-height` CSS variable in `AnnouncementBar.tsx`.
    - Use this variable in `Header.tsx` for the `top` position of the sticky header and mobile menu.

## Progress
- [ ] Implement persistence logic in `AnnouncementBar.tsx`
- [ ] Add close button to `AnnouncementBar.tsx`
- [ ] Update `Header.tsx` to handle dynamic positioning when the banner is dismissed
