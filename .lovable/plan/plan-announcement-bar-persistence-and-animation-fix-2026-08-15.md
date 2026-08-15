# Plan - Announcement Bar Persistence and Animation Fix

Ensure the announcement bar's dismissed state is correctly respected across sessions and ensure the message transitions are smooth without causing cumulative layout shift or flickering.

## User-facing changes
- **Persistence**: The announcement bar will now stay hidden if you've dismissed it in a previous session, even after refreshing the page multiple times.
- **Visual Stability**: Transitions between messages will be smoother, preventing the page from jumping or flickering during the rotation.

## Technical details
- **Mount Synchronization**: Refine the `useEffect` in `AnnouncementBar.tsx` to handle the `localStorage` check more robustly, ensuring the `--announcement-bar-height` variable is set correctly before the first paint if possible (or minimizing the delay).
- **Animation Refinement**: Adjust the transition duration and easing in the `handleNext`/`handlePrev` functions to match the CSS transition property for a seamless experience.
- **State Reset**: Add a mechanism to reset the visibility if the message array changes significantly (though not strictly requested, it's good practice for promotional bars).

## Progress
- [x] Implement dismiss logic with `localStorage` (already present, verifying and hardening)
- [ ] Refine height synchronization to prevent layout shift
- [ ] Smooth out the transition between messages
