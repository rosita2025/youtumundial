import { countryFlags } from "@/lib/reviews/reviews";
import { useReviewSummary } from "@/lib/reviews/use-reviews";
import { StarRating } from "@/components/product/StarRating";
import { BadgeCheck } from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function ProductReviews({ slug }: { slug: string }) {
  const { reviews, total, average, distribution } = useReviewSummary(slug);

  if (!total) return null;

  return (
    <section className="mt-20 border-t border-border pt-12" id="resenas">
      <h2 className="heading-section mb-8">Reseñas de clientes</h2>

      <div className="grid gap-10 md:grid-cols-[260px_1fr]">
        <div>
          <div className="text-4xl font-medium">{average.toFixed(1)}</div>
          <StarRating rating={average} size={18} className="mt-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            Basado en {total} {total === 1 ? "reseña" : "reseñas"}
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
                    <BadgeCheck size={14} /> Compra verificada
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <StarRating rating={review.rating} size={14} />
                <span className="text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(review.date))}
                </span>
                {review.size && (
                  <span className="text-xs text-muted-foreground">Talla: {review.size}</span>
                )}
              </div>

              <h3 className="mt-3 font-medium">{review.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{review.body}</p>
            </li>

          ))}
        </ul>
      </div>
    </section>
  );
}
