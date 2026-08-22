import { memo } from 'react';
import { Link } from '@/lib/router-compat';
import { Product } from '@/lib/data/types';
import { formatPrice, calculateDiscount } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export const ProductCard = memo(function ProductCard({ product, className }: ProductCardProps) {
  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;
  const soldOut =
    Array.isArray(product.variants) && product.variants.length > 0
      ? !product.variants.some((v) => v.available)
      : false;


  return (
    <Link
      to={`/products/${product.slug}`}
      className={cn(
        'group block',
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <img
          src={product.images[0]?.url}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        
        {/* Hover image */}
        {product.images[1] && (
          <img
            src={product.images[1].url}
            alt={`${product.title} - alternate view`}
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Sale badge */}
        {discount > 0 && !soldOut && (
          <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-medium px-2 py-1 rounded">
            {discount}% Off
          </span>
        )}

        {/* Sold out */}
        {soldOut && (
          <>
            <div className="absolute inset-0 bg-background/60" />
            <span className="absolute top-3 left-3 bg-foreground text-background text-xs font-medium px-2 py-1 rounded">
              Agotado
            </span>
          </>
        )}
      </div>


      {/* Product Info */}
      <div className="mt-4 space-y-1">
        {product.vendor && (
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {product.vendor}
          </p>
        )}
        <h3 className="font-medium text-foreground group-hover:underline transition-all">
          {product.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatPrice(product.price)}</span>
          {product.compareAtPrice && (
            <span className="text-muted-foreground line-through text-sm">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});
