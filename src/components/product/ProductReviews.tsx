import { countryFlags, Review } from "@/lib/reviews/reviews";
import { useReviewSummary } from "@/lib/reviews/use-reviews";
import { StarRating } from "@/components/product/StarRating";
import { BadgeCheck, CheckCircle2, Camera, Plus, ChevronRight, X } from "lucide-react";
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

// Hydration-safe date formatter
const formatDate = (date: string) => {
  const d = new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

export function ProductReviews({ slug }: { slug: string }) {
  const { reviews, total, average, distribution } = useReviewSummary(slug);
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | '5stars'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const photoReviews = useMemo(() => 
    reviews.filter(r => r.photos && r.photos.length > 0),
    [reviews]
  );

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
    <section className="mt-24 border-t border-border pt-16 max-w-6xl mx-auto px-4" id="reviews">
      {/* 1. TOP UGC PHOTO GRID (Carousel-style) */}
      {photoReviews.length > 0 && (
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Camera size={20} className="text-primary" />
              Customer Gallery
            </h3>
            <span className="text-sm font-medium text-muted-foreground">{photoReviews.length} Photos</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photoReviews.slice(0, 4).map((review, i) => (
              <Dialog key={`${review.author}-${i}`}>
                <DialogTrigger asChild>
                  <button className="group relative aspect-[4/5] overflow-hidden rounded-[12px] shadow-md transition-all hover:shadow-xl hover:-translate-y-1 select-none">
                    <img
                      src={review.photos![0]}
                      alt={`Review by ${review.author}`}
                      className="h-full w-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 left-3 right-3 text-white text-left opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1 mb-1">
                        <StarRating rating={5} size={10} className="text-yellow-400" />
                      </div>
                      <p className="text-[10px] font-medium leading-tight line-clamp-2 italic">
                        "{review.body.slice(0, 60)}..."
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[8px] font-bold uppercase tracking-wider">
                        {review.author} <CheckCircle2 size={8} className="text-green-400" />
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden rounded-2xl">
                  <VisuallyHidden><DialogTitle>Review by {review.author}</DialogTitle></VisuallyHidden>
                  <div className="flex flex-col md:flex-row h-full">
                    <div className="w-full md:w-1/2 bg-black flex items-center justify-center p-0">
                      <img src={review.photos![0]} alt="" className="max-h-[70vh] w-auto object-contain" />
                    </div>
                    <div className="w-full md:w-1/2 p-6 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-bold flex items-center gap-2">
                            {review.author}
                            <BadgeCheck size={16} className="text-primary" />
                          </p>
                          <StarRating rating={review.rating} size={14} />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(review.date)}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground italic mb-6">"{review.body}"</p>
                      <div className="mt-auto pt-6 border-t">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter text-green-600">
                          <CheckCircle2 size={14} /> Verified Buyer
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>
      )}

      {/* 2. SUMMARY HEADER */}
      <div className="bg-white rounded-[20px] p-8 shadow-sm border border-border/50 mb-12 flex flex-col md:flex-row items-center gap-10">
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
                { id: 'all', label: 'All Reviews', count: total },
                { id: 'photos', label: 'With Photos', count: photoReviews.length },
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

      {isFormOpen && (
        <div className="mb-12 bg-primary/5 p-8 rounded-2xl border-2 border-primary/20 animate-in fade-in zoom-in-95">
          <ReviewForm slug={slug} />
        </div>
      )}

      {/* 3. INDIVIDUAL REVIEW LIST */}
      <div className="space-y-6">
        {filteredReviews.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground italic">
            No reviews match your filter.
          </div>
        ) : (
          filteredReviews.map((review, i) => (
            <div key={`${review.author}-${i}`} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-border/60 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                    {review.author.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-foreground">{review.author}</span>
                      {review.verified && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                          <CheckCircle2 size={10} /> Verified
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <span>{countryFlags[review.country] ?? ""} {review.country}</span>
                      <span>•</span>
                      <span>{formatDate(review.date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StarRating rating={review.rating} size={16} />
                  {review.size && (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">Size: {review.size}</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-bold text-foreground leading-tight">{review.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{review.body}</p>
                
                {review.photos && review.photos.length > 0 && (
                  <div className="flex gap-3 pt-4">
                    {review.photos.map((photo, idx) => (
                      <Dialog key={idx}>
                        <DialogTrigger asChild>
                          <button className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-border/40 hover:border-primary transition-colors select-none group">
                            <img src={photo} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                            <div className="absolute bottom-1 right-1 bg-black/40 p-1 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera size={12} className="text-white" />
                            </div>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none sm:rounded-none">
                          <VisuallyHidden><DialogTitle>Review photo by {review.author}</DialogTitle></VisuallyHidden>
                          <div className="relative flex items-center justify-center p-4">
                            <img src={photo} alt="" className="max-h-[85vh] w-auto rounded-lg object-contain shadow-2xl" />
                            <span className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold tracking-widest backdrop-blur-md uppercase">
                              @youtumundial
                            </span>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
