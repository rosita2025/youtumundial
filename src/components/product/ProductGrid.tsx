import { useState, useEffect } from 'react';
import { Product } from '@/lib/data/types';
import { ProductCard } from './ProductCard';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

interface ProductGridProps {
  products: Product[];
  className?: string;
}

export function ProductGrid({ products, className }: ProductGridProps) {
  const [displayCount, setDisplayCount] = useState(12);
  const { targetRef, isIntersecting } = useIntersectionObserver({
    rootMargin: '200px',
  });

  useEffect(() => {
    if (isIntersecting && displayCount < products.length) {
      setDisplayCount((prev) => Math.min(prev + 12, products.length));
    }
  }, [isIntersecting, products.length, displayCount]);

  // Reset display count when products change (e.g. filtering)
  useEffect(() => {
    setDisplayCount(12);
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted-foreground">No products found</p>
      </div>
    );
  }

  const visibleProducts = products.slice(0, displayCount);

  return (
    <div className="space-y-12">
      <div
        className={cn(
          'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8',
          className
        )}
      >
        {visibleProducts.map((product, index) => (
          <div
            key={product.id}
            className="animate-fade-up"
            style={{ animationDelay: `${(index % 12) * 50}ms` }}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
      
      {displayCount < products.length && (
        <div ref={targetRef} className="h-20 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
