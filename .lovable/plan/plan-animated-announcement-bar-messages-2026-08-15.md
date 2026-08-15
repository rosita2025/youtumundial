# Plan - Animated Announcement Bar Messages

Transform the announcement bar into a scrolling/moving message ticker (rotating messages) to improve engagement and visibility of current offers.

## User-facing changes
- **Rotating Messages**: Instead of a static message, the announcement bar will now cycle through multiple promotional messages:
    1. "Enjoy 5% off for your first order. Use code **WELCOME5**"
    2. "Free shipping on orders over $45 worldwide"
    3. "New arrivals synced automatically from our store"
- **Smooth Animation**: Messages will fade or slide in and out periodically.

## Technical details
- **State Management**: Update `AnnouncementBar.tsx` to include an array of messages and an active index state.
- **Interval Logic**: Use a `useEffect` with `setInterval` to cycle through messages every 5-7 seconds.
- **Animation**: Implement a CSS transition or Framer Motion (if available, otherwise standard Tailwind transitions) for smooth message swapping.
- **Accessibility**: Ensure the ticker is screen-reader friendly (aria-live region).

## Progress
- [ ] Add message rotation logic to `AnnouncementBar.tsx`
- [ ] Implement slide/fade animations for message transitions
- [ ] Add new promotional messages to the list
