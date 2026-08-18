import { Link } from '@/lib/router-compat';
import { Product } from '@/lib/data/types';
import { ProductCard } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface TrendingProductsProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
}

export function TrendingProducts({
  products,
  title = 'Trending Now',
  subtitle = 'Our most popular picks this season',
  viewAllLink = '/products',
}: TrendingProductsProps) {
  return (
    <section className="container-wide py-16 md:py-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
        <div>
          <h2 className="heading-section">{title}</h2>
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        </div>
        <Button variant="ghost" asChild className="self-start md:self-auto">
          <Link to={viewAllLink}>
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="relative overflow-hidden">
        <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 scrollbar-hide snap-x">
          {products.slice(0, 4).map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-up min-w-[280px] sm:min-w-0 snap-start"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
