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
    <section className="photo-carousel-banner py-6 bg-white overflow-hidden">
      <div className="container-wide px-4 mb-4 text-center">
        <h2 className="text-[18px] font-bold text-[#111111]">
          10,000+ Happy Customers
        </h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="w-3 h-3 bg-[#00B67A] flex items-center justify-center rounded-[1px]">
                <span className="text-white text-[7px]">★</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-medium text-muted-foreground">
            Rated <span className="font-bold text-[#111111]">Excellent 4.9 out of 5</span> based on 2,500+ Trustpilot reviews
          </p>
        </div>
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
        .photo-carousel-banner .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .photo-carousel-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      `}</style>
    </section>
  );
}
