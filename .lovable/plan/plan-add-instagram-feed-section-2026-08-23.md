# Plan: Add Instagram Feed Section

The user wants to sync posts and reels from Instagram. I will implement a visually attractive "Instagram Feed" section for the homepage that displays posts and reels, using a grid layout. Since direct API integration without a backend/token management system is complex, I will start with a high-quality static grid that is easy to update or connect to a feed aggregator in the future.

## Changes

### Components
- Create `src/components/home/InstagramFeed.tsx`: A new section showing a grid of Instagram posts and reels with hover effects, links to the profile, and an "Instagram" header.
- Update `src/components/pages/Index.tsx`: Mount the new `InstagramFeed` component between `FeaturedCollections` and `TrendingProducts` (or before `Newsletter`).

## Technical Details
- Responsive grid (2 cols mobile, 3 cols tablet, 4-6 cols desktop).
- Use `Instagram` icon from `lucide-react`.
- Support for "Reels" badge on video posts.
- Hover state showing likes/comments count (static for now) or a simple "View on Instagram" overlay.
- Links to `https://www.instagram.com/youtumundialshop/`.
