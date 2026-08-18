import { countryFlags, Review } from "@/lib/reviews/reviews";
import { useReviewSummary } from "@/lib/reviews/use-reviews";
import { StarRating } from "@/components/product/StarRating";
import { BadgeCheck, CheckCircle2, Camera, Plus, X, ShoppingCart, Info } from "lucide-react";
import { ReviewForm } from "@/components/product/ReviewForm";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductVariant } from "@/lib/data/types";
import { formatPrice } from "@/lib/utils/format";

// Hydration-safe date formatter
const formatDate = (date: string) => {
  const d = new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

interface ProductReviewsProps {
  slug: string;
  selectedVariant?: ProductVariant | null;
  onAddToCart?: () => void;
}

export function ProductReviews({ slug, selectedVariant, onAddToCart }: ProductReviewsProps) {
  const { reviews, total, average, distribution } = useReviewSummary(slug);
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | '5stars'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];
    if (activeFilter === 'photos') {
      filtered = filtered.filter(r => r.photos && r.photos.length > 0);
    } else if (activeFilter === '5stars') {
      filtered = filtered.filter(r => r.rating === 5);
    }
    return filtered;
  }, [reviews, activeFilter]);

  if (!total) {
    return (
      <section className="mt-20 border-t border-border pt-12 max-w-6xl mx-auto px-4" id="reviews">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-bold mb-4">Customer Reviews</h2>
          <p className="mb-8 text-muted-foreground max-w-md">
            No reviews yet. Be the first to share your experience with this product!
          </p>
          <Button onClick={() => setIsFormOpen(true)} className="rounded-full px-8 py-6 text-lg font-bold shadow-xl hover:scale-105 transition-transform">
            WRITE A REVIEW
          </Button>
        </div>
        
        {isFormOpen && (
          <div className="mt-12 bg-muted/30 p-8 rounded-2xl animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Submit Your Review</h3>
              <button onClick={() => setIsFormOpen(false)}><X size={20} /></button>
            </div>
            <ReviewForm slug={slug} />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mt-16 border-t border-border pt-12 max-w-6xl mx-auto px-4 pb-40" id="reviews">
      {/* SUMMARY HEADER - COMPACT REDESIGN */}
      <div className="bg-white rounded-[20px] p-4 md:p-8 shadow-sm border border-border/50 mb-6 md:mb-12">
        {/* Mobile Compact View (Hidden on Desktop) */}
        <div className="flex md:hidden flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black">{average.toFixed(1)}</span>
            <StarRating rating={average} size={16} className="text-yellow-400" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
              (Based on {total} Verified Reviews)
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All', count: total },
                { id: 'photos', label: 'With Photos', count: reviews.filter(r => r.photos?.length).length },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0",
                    activeFilter === filter.id 
                      ? "bg-primary text-white border-primary" 
                      : "bg-background text-muted-foreground border-border"
                  )}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="text-[10px] font-black text-primary underline underline-offset-4 flex items-center gap-1 shrink-0"
            >
              <Plus size={10} strokeWidth={3} /> WRITE A REVIEW
            </button>
          </div>
        </div>

        {/* Desktop View (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-10">
          <div className="text-center md:text-left md:border-r border-border md:pr-10 min-w-[200px]">
            <div className="text-6xl font-black text-foreground mb-1">{average.toFixed(1)}</div>
            <StarRating rating={average} size={24} className="justify-center md:justify-start mb-2" />
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Based on {total} Reviews
            </p>
          </div>

          <div className="flex-1 w-full">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All', count: total },
                  { id: 'photos', label: 'Photos', count: reviews.filter(r => r.photos?.length).length },
                  { id: '5stars', label: '5 Stars', count: distribution.find(d => d.star === 5)?.count ?? 0 },
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id as any)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                      activeFilter === filter.id 
                        ? "bg-primary text-white border-primary shadow-md" 
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
              
              <Button 
                onClick={() => setIsFormOpen(!isFormOpen)}
                variant="outline"
                className="rounded-full border-2 font-bold hover:bg-primary hover:text-white hover:border-primary transition-all gap-2"
              >
                <Plus size={16} /> WRITE A REVIEW
              </Button>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(star => {
                const d = distribution.find(x => x.star === star);
                const percent = total ? ((d?.count || 0) / total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-xs font-medium">
                    <span className="w-10 text-muted-foreground">{star} Stars</span>
                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{d?.count || 0}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="mb-12 bg-primary/5 p-8 rounded-2xl border-2 border-primary/20 animate-in fade-in zoom-in-95">
          <ReviewForm slug={slug} />
        </div>
      )}

      {/* UGC PHOTO GRID (LOOX STYLE) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[12px]">
        {filteredReviews.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground italic">
            No reviews match your filter.
          </div>
        ) : (
          filteredReviews.map((review, i) => (
            <Dialog key={`${review.author}-${i}`}>
              <DialogTrigger asChild>
                <button className="group relative w-full aspect-[4/5] bg-white rounded-xl overflow-hidden shadow-sm border border-border/40 hover:shadow-lg transition-all text-left flex flex-col select-none">
                  {/* Photo Section (70% Height) */}
                  <div className="h-[70%] w-full relative overflow-hidden bg-muted">
                    {review.photos && review.photos.length > 0 ? (
                      <>
                        <img
                          src={review.photos[0]}
                          alt={`Review by ${review.author}`}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105 pointer-events-none"
                          onContextMenu={(e) => e.preventDefault()}
                          draggable={false}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-transparent z-10" onContextMenu={(e) => e.preventDefault()} />
                        {/* Star Rating Overlay */}
                        <div className="absolute bottom-2 left-2 z-20 drop-shadow-md">
                          <StarRating rating={review.rating} size={10} className="text-yellow-400" />
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                        <Camera size={32} strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  {/* Info Section (30% Height) */}
                  <div className="h-[30%] p-2.5 flex flex-col justify-between overflow-hidden">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[12px] font-bold text-foreground truncate">
                          {review.author}
                        </span>
                        {review.verified && (
                          <div className="flex items-center gap-0.5 text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0">
                            <CheckCircle2 size={8} /> Verified
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2 italic">
                        "{review.body}"
                      </p>
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 font-medium">
                      {formatDate(review.date)}
                    </div>
                  </div>
                </button>
              </DialogTrigger>

              {/* LIGHTBOX MODAL */}
              <DialogContent className="max-w-[95vw] md:max-w-4xl bg-white p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                <VisuallyHidden><DialogTitle>Review by {review.author}</DialogTitle></VisuallyHidden>
                <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                  {/* Large Image View */}
                  <div className="w-full md:w-[60%] bg-black flex items-center justify-center relative min-h-[300px]">
                    {review.photos && review.photos.length > 0 ? (
                      <img 
                        src={review.photos[0]} 
                        alt="" 
                        className="max-h-[85vh] w-full object-contain pointer-events-none" 
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                      />
                    ) : (
                      <div className="text-white/20 flex flex-col items-center gap-2">
                        <Camera size={48} strokeWidth={1} />
                        <span className="text-xs uppercase tracking-widest font-bold">No Photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 text-white/90 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest backdrop-blur-md uppercase">
                      @youtumundial
                    </span>
                  </div>

                  {/* Review Detail Info */}
                  <div className="w-full md:w-[40%] p-6 md:p-8 flex flex-col overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">
                          {review.author.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold flex items-center gap-1.5">
                            {review.author}
                            <BadgeCheck size={16} className="text-primary" />
                          </p>
                          <StarRating rating={review.rating} size={14} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(review.date)}</span>
                    </div>

                    <div className="space-y-4 mb-8">
                      <h4 className="text-lg font-bold leading-tight">{review.title}</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground italic">"{review.body}"</p>
                    </div>

                    <div className="mt-auto space-y-6">
                      <div className="flex flex-wrap gap-4 items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          <CheckCircle2 size={12} /> Verified Buyer
                        </div>
                        {review.country && (
                          <div className="flex items-center gap-1">
                            {countryFlags[review.country]} {review.country}
                          </div>
                        )}
                        {review.size && (
                          <div className="bg-muted px-2 py-1 rounded-full">
                            Size: {review.size}
                          </div>
                        )}
                      </div>

                      {/* Modal Add to Cart CTA */}
                      {selectedVariant && (
                        <div className="pt-6 border-t border-border/60">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0">
                              <img src={selectedVariant.image?.url} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase truncate">Currently Viewing</p>
                              <p className="text-sm font-bold truncate leading-tight">{selectedVariant.title || 'Cozy Pet Carrier'}</p>
                              <p className="text-sm font-black text-primary">{formatPrice(43.99)}</p>
                            </div>
                          </div>
                          <Button 
                            className="w-full h-12 bg-[#FFB800] hover:bg-[#FFB800]/90 text-black font-black shadow-lg"
                            onClick={onAddToCart}
                          >
                            <ShoppingCart size={16} className="mr-2" />
                            ADD TO CART
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))
        )}
      </div>
    </section>
  );
}