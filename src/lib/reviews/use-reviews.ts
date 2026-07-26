import { useEffect, useState } from "react";
import { getReviewSummary } from "./reviews";
import { readLocalReviews, subscribeLocalReviews } from "./local-store";

/**
 * Resumen de reseñas de un producto. En el servidor usa las reseñas del
 * archivo; en el navegador suma las publicadas desde /admin/resenas.
 */
export function useReviewSummary(slug: string) {
  const [summary, setSummary] = useState(() => getReviewSummary(slug));

  useEffect(() => {
    const update = () => setSummary(getReviewSummary(slug, readLocalReviews()));
    update();
    return subscribeLocalReviews(update);
  }, [slug]);

  return summary;
}
