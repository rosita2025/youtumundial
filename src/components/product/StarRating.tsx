import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  size?: number;
  className?: string;
}

export function StarRating({ rating, size = 16, className }: StarRatingProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${rating.toFixed(1)} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i <= Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground/40"
          )}
        />
      ))}
    </span>
  );
}
