import { countryFlags } from "@/lib/reviews/reviews";
import { useReviewSummary } from "@/lib/reviews/use-reviews";
import { StarRating } from "@/components/product/StarRating";
import { BadgeCheck } from "lucide-react";
import { ReviewForm } from "@/components/product/ReviewForm";
import { useState, useEffect } from "react";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function ReviewDate({ date }: { date: string }) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    setFormatted(dateFormatter.format(new Date(date)));
  }, [date]);

  if (!formatted) {
    return <span className="invisible">Date</span>;
  }

  return <>{formatted}</>;
}

export function ProductReviews({ slug }: { slug: string }) {
  const { reviews, total, average, distribution } = useReviewSummary(slug);

  if (!total) {
    return (
      <section className="mt-20 border-t border-border pt-12" id="resenas">
        <h2 className="heading-section mb-4">Customer Reviews</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          No reviews for this product yet. If you've already purchased it, be the first to share your thoughts.
        </p>
        <ReviewForm slug={slug} />
      </section>
    );
  }

  return (
    <section className="mt-20 border-t border-border pt-12" id="resenas">
      <h2 className="heading-section mb-8">Customer Reviews</h2>

      <div className="grid gap-10 md:grid-cols-[260px_1fr]">
        <div>
          <div className="text-4xl font-medium">{average.toFixed(1)}</div>
          <StarRating rating={average} size={18} className="mt-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            Based on {total} {total === 1 ? "review" : "reviews"}
          </p>

          <div className="mt-5 space-y-1.5">
            {distribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-8">{star} ★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-5 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <ul className="space-y-6">
          {reviews.map((review, i) => (
            <li key={`${review.author}-${i}`} className="border-b border-border pb-6 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{review.author}</span>
                <span className="text-sm text-muted-foreground">
                  {countryFlags[review.country] ?? ""} {review.country}
                </span>
                {review.verified && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <BadgeCheck size={14} /> Verified Purchase
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <StarRating rating={review.rating} size={14} />
                <span className="text-xs text-muted-foreground">
                  <ReviewDate date={review.date} />
                </span>
                {review.size && (
                  <span className="text-xs text-muted-foreground">Size: {review.size}</span>
                )}
              </div>

              <h3 className="mt-3 font-medium">{review.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{review.body}</p>

              {review.photos && review.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.photos.slice(0, 6).map((photo) => (
                    <a key={photo} href={photo} target="_blank" rel="noreferrer">
                      <img
                        src={photo}
                        alt={`Review photo by ${review.author}`}
                        loading="lazy"
                        className="h-20 w-20 rounded-md border border-border object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </li>

          ))}
          </ul>

          <div className="mt-8">
            <ReviewForm slug={slug} />
          </div>
        </div>
    </section>
  );
}
