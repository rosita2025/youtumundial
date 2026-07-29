import { Link } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Product } from '@/lib/data/types';
import { formatPrice } from '@/lib/utils/format';

interface HeroProps {
  /** Producto más reciente publicado en Shopify (lanzamiento actual). */
  latestProduct?: Product | null;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1000&fit=crop';

export function Hero({ latestProduct }: HeroProps) {
  const image = latestProduct?.images?.[0]?.url || FALLBACK_IMAGE;
  const imageAlt =
    latestProduct?.images?.[0]?.altText || latestProduct?.title || 'New arrival';

  const heading = latestProduct
    ? latestProduct.title
    : 'Thoughtfully made essentials for everyday life';
  const description = latestProduct
    ? latestProduct.description?.slice(0, 180) ||
      'Just landed in our store. Limited stock available.'
    : 'Discover our curated collection of sustainable clothing and accessories. Designed for comfort, built to last, and made with the planet in mind.';

  const primaryLink = latestProduct ? `/products/${latestProduct.slug}` : '/products';
  const primaryLabel = latestProduct ? 'Shop this drop' : 'Shop Collection';

  return (
    <section className="relative overflow-hidden bg-secondary/30">
      <div className="container-wide py-16 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6 animate-fade-up">
            <span className="inline-block text-sm font-medium text-primary tracking-wide uppercase">
              {latestProduct ? 'Just Launched' : 'New Season Collection'}
            </span>
            {latestProduct?.vendor && (
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {latestProduct.vendor}
              </p>
            )}
            <h1 className="heading-display text-balance">{heading}</h1>
            <p className="text-lg text-muted-foreground max-w-lg">{description}</p>
            {latestProduct && (
              <p className="text-2xl font-medium">
                {formatPrice(latestProduct.price)}
                {latestProduct.compareAtPrice ? (
                  <span className="ml-3 text-base text-muted-foreground line-through">
                    {formatPrice(latestProduct.compareAtPrice)}
                  </span>
                ) : null}
              </p>
            )}
            <div className="flex flex-wrap gap-4 pt-2">
              <Button size="lg" asChild>
                <Link to={primaryLink}>
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/products?sort=newest">New Arrivals</Link>
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative animate-fade-up stagger-2">
            <Link
              to={primaryLink}
              className="block aspect-square rounded-2xl overflow-hidden shadow-hover"
            >
              <img
                src={image}
                alt={imageAlt}
                width={800}
                height={800}
                loading="eager"
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
            </Link>
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-background rounded-xl shadow-soft p-4 max-w-[220px]">
              <p className="text-sm font-medium">
                {latestProduct ? 'New arrival' : '100% Sustainable'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latestProduct
                  ? 'Latest release, synced automatically from our store.'
                  : 'Made from recycled and organic materials'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
