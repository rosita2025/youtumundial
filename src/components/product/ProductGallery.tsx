import { useState, useEffect } from 'react';
import { ProductImage, ProductVariant } from '@/lib/data/types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductGalleryProps {
  images: ProductImage[];
  productTitle: string;
}

export function ProductGallery({ images, productTitle }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleVariantChange = (e: any) => {
      const variant = e.detail.variant as ProductVariant;
      if (variant?.image?.url) {
        const index = images.findIndex(img => img.url === variant.image?.url);
        if (index !== -1) {
          setSelectedIndex(index);
          // Scroll to top of gallery on mobile to show the change
          if (window.innerWidth < 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      }
    };

    window.addEventListener('product-variant-changed', handleVariantChange);
    return () => window.removeEventListener('product-variant-changed', handleVariantChange);
  }, [images]);

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No image available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square md:aspect-square max-h-[420px] md:max-h-none overflow-hidden rounded-lg bg-muted group select-none flex items-center justify-center">
        <img
          src={images[selectedIndex].url}
          alt={images[selectedIndex].altText || productTitle}
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
        <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-background"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-background"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Dots indicator for mobile */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 md:hidden">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === selectedIndex ? 'bg-foreground' : 'bg-foreground/30'
                )}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="hidden md:grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'aspect-square overflow-hidden rounded-lg border-2 transition-all',
                index === selectedIndex
                  ? 'border-foreground'
                  : 'border-transparent hover:border-muted-foreground/50'
              )}
            >
            <div className="relative w-full h-full">
              <img
                src={image.url}
                alt={image.altText || `${productTitle} thumbnail ${index + 1}`}
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
              <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
            </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
