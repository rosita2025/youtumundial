import { useEffect, useState } from 'react';
import { fbEvent } from '@/lib/facebook-pixel';
import { useParams, Link } from '@/lib/router-compat';
import { Layout } from '@/components/layout/Layout';
import { ProductGallery } from '@/components/product/ProductGallery';
import { VariantSelector } from '@/components/product/VariantSelector';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { selectRelatedProducts } from '@/lib/data/data-provider';
import { Product, ProductVariant } from '@/lib/data/types';
import { formatPrice, calculateDiscount } from '@/lib/utils/format';
import { ProductReviews } from '@/components/product/ProductReviews';
import { StarRating } from '@/components/product/StarRating';
import { useReviewSummary } from '@/lib/reviews/use-reviews';
import { ReviewDiagnostics } from '@/components/product/ReviewDiagnostics';
import { Minus, Plus, Truck, RotateCcw, Shield, ShoppingCart, Heart, Gem } from 'lucide-react';
import { StickyAddToCart } from '@/components/product/StickyAddToCart';

interface ProductDetailProps {
  catalog?: Product[];
}

const ProductDetail = ({ catalog = [] }: ProductDetailProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();
  const product = catalog.find((p) => p.slug === slug) ?? null;
  const relatedProducts = product ? selectRelatedProducts(catalog, product, 4) : [];
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const reviewSummary = useReviewSummary(product?.slug ?? slug ?? '');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const selectedVariant: ProductVariant | null = product
    ? product.variants.find((v) => v.id === variantId) ??
      product.variants.find((v) => v.available) ??
      product.variants[0] ??
      null
    : null;
  const setSelectedVariant = (variant: ProductVariant) => setVariantId(variant.id);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowDiagnostics(params.get('debug') === '1' || params.get('diag') === '1');
  }, []);

  useEffect(() => {
    setVariantId(null);
    setQuantity(1);
  }, [slug]);

  useEffect(() => {
    if (product) {
      fbEvent.track('ViewContent', {
        content_name: product.title,
        content_category: product.productType,
        content_ids: [product.id],
        content_type: 'product',
        value: product.price,
        currency: 'USD'
      });
    }
  }, [product?.id]);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    
    fbEvent.track('AddToCart', {
      content_name: product.title,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price * quantity,
      currency: 'USD'
    });

    addToCart(product, selectedVariant, quantity);
    setQuantity(1);
  };

  if (!product) {
    return (
      <Layout>
        <div className="container-wide py-16 text-center">
          <h1 className="text-2xl font-medium mb-4">Product not found</h1>
          <Button asChild>
            <Link to="/products">Continue Shopping</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;

  return (
    <Layout>
      <div className="container-wide py-8 md:py-12">
        <Breadcrumbs
          items={[
            { label: 'Products', href: '/products' },
            { label: product.title },
          ]}
        />

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          {/* Gallery */}
          <ProductGallery images={product.images} productTitle={product.title} />

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {(product.vendor || product.productType) && (
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {[product.vendor, product.productType].filter(Boolean).join(' · ')}
                </p>
              )}
              <h1 className="font-heading text-3xl md:text-4xl font-medium">
                {product.title}
              </h1>
              {product.collections.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {product.collections.map((slug) => (
                    <Link
                      key={slug}
                      to={`/collections/${slug}`}
                      className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                    >
                      {product.collectionTitles?.[slug] ??
                        slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Link>
                  ))}
                </div>
              )}
              {reviewSummary.total > 0 && (
                <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm">
                  <StarRating rating={reviewSummary.average} size={15} />
                  <span className="text-muted-foreground underline-offset-4 hover:underline">
                    {reviewSummary.average.toFixed(1)} · {reviewSummary.total} reviews
                  </span>
                </a>
              )}
              <div className="flex items-center gap-3 mt-2">

                <span className="text-2xl font-medium">
                  {formatPrice(product.price)}
                </span>
                {product.compareAtPrice && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(product.compareAtPrice)}
                    </span>
                    <span className="bg-destructive text-destructive-foreground text-sm font-medium px-2 py-0.5 rounded">
                      {discount}% Off
                    </span>
                  </>
                )}
              </div>
            </div>

            {product.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* Variant Selector */}
            <VariantSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelect={setSelectedVariant}
            />

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium mb-3">Quantity</label>
              <div className="flex items-center border border-border rounded-md w-fit">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-3 hover:bg-muted transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-3 hover:bg-muted transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={!selectedVariant?.available}
            >
              {selectedVariant?.available ? 'Add to Cart' : 'Out of Stock'}
            </Button>
            
            {/* Payment Trust Badges for Conversion */}
            <div className="pt-4 flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Guaranteed Safe Checkout</span>
              <div className="flex items-center justify-center gap-4 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                <img src="https://static-00.iconduck.com/assets.00/visa-icon-2048x628-66dq799i.png" alt="Visa" className="h-1.5 w-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4 w-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-3 w-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-4 w-auto" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Pay_Logo_%282020%29.svg" alt="Google Pay" className="h-3.5 w-auto" />
              </div>
            </div>


            {/* Features & Trust Markers */}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Truck size={18} className="text-primary" />
                <div>
                  <span className="font-medium block">Free Singapore delivery</span>
                  <span className="text-muted-foreground text-xs">No minimum spend required</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <RotateCcw size={18} className="text-primary" />
                <div>
                  <span className="font-medium block">Easy Returns</span>
                  <span className="text-muted-foreground text-xs">Returns within 7 days receive a full refund</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Heart size={18} className="text-primary" />
                <div>
                  <span className="font-medium block">Keep what fits well</span>
                  <span className="text-muted-foreground text-xs">Love it or Your Money Back!</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Gem size={18} className="text-primary" />
                <div>
                  <span className="font-medium block">Premium Quality</span>
                  <span className="text-muted-foreground text-xs">Built-In Comfort in every stitch</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reseñas */}
        <ProductReviews slug={product.slug} />

        {showDiagnostics && <ReviewDiagnostics slug={product.slug} />}


        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h2 className="heading-section mb-8">You May Also Like</h2>
            <ProductGrid products={relatedProducts} />
          </section>
        )}

        {/* Sticky Add to Cart (Visible solo en scroll) */}
        <StickyAddToCart 
          product={product} 
          selectedVariant={selectedVariant}
          quantity={quantity}
          onAdd={handleAddToCart}
        />
      </div>
    </Layout>
  );
};

export default ProductDetail;
