import { useReviewSummary } from "@/lib/reviews/use-reviews";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function PhotoCarouselBanner({ slug }: { slug: string }) {
  const { reviews } = useReviewSummary(slug);
  const [isPaused, setIsPaused] = useState(false);

  // Filter reviews with photos
  const photoReviews = reviews.filter((r) => r.photos && r.photos.length > 0);

  if (photoReviews.length === 0) return null;

  // Double the reviews for seamless looping
  const displayReviews = [...photoReviews, ...photoReviews, ...photoReviews];

  return (
    <section className="py-6 bg-white overflow-hidden">
      <div className="container-wide px-4 mb-4">
        <h2 className="text-[18px] font-bold text-[#111111] text-center">
          10,000+ Happy Customers
        </h2>
      </div>

      <div 
        className="relative h-[200px] md:h-[240px] overflow-hidden group flex items-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <div 
          className={cn(
            "flex flex-row items-center gap-3 w-max",
            isPaused ? "[animation-play-state:paused]" : "animate-marquee"
          )}
        >
          {displayReviews.map((review, i) => (
            <div 
              key={`${review.author}-${i}`}
              className="relative w-[130px] h-[165px] md:w-[160px] md:h-[200px] shrink-0 rounded-[12px] overflow-hidden bg-muted border border-border/40 shadow-sm"
            >
              <img
                src={review.photos?.[0]}
                alt={`Review by ${review.author}`}
                className="block h-full w-full object-cover pointer-events-none select-none"
                draggable={false}
              />
              <div className="absolute inset-0 bg-transparent z-10" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-33.33% - 8px)); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </section>
  );
}
