import { useEffect, useState, useMemo } from 'react';
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
import { Minus, Plus, Truck, RotateCcw, Heart, Gem, ShoppingCart, Lock, Users, Calendar } from 'lucide-react';
import { StickyAddToCart } from '@/components/product/StickyAddToCart';
import { ProductTrustStrip, PaymentTrustBlock } from '@/components/product/ProductTrustStrip';
import { ProductFaq } from '@/components/product/ProductFaq';
import { deliveryEstimatePhrase, socialProofSoldCount, inStockLabel } from '@/lib/utils/product-trust';
import { detectVisitorGeo } from '@/lib/checkout/geo.functions';
import { useServerFn } from '@tanstack/react-start';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/checkout/config';
import { InstagramFeed } from '@/components/home/InstagramFeed';


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
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined);
  const getVisitorGeo = useServerFn(detectVisitorGeo);

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

  useEffect(() => {
    let cancelled = false;
    getVisitorGeo().then((geo) => {
      if (!cancelled && geo.countryCode) {
        setCountryCode(geo.countryCode);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [getVisitorGeo]);

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

  const deliveryEstimate = deliveryEstimatePhrase(countryCode);
  const soldToday = socialProofSoldCount(product.slug);
  const stockLabel = selectedVariant ? inStockLabel(selectedVariant) : '';
  const isLowStock = stockLabel.startsWith('Only');
  const progressToFreeShipping = Math.min(100, (product.price / FREE_SHIPPING_THRESHOLD) * 100);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - product.price);

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
          <div className="space-y-5">
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
              <div className="flex items-center gap-3 mt-3">
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

              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <p className="text-sm text-primary mt-1">
                  You save {formatPrice(product.compareAtPrice - product.price)} today
                </p>
              )}

              <div className="mt-3">
                <ProductTrustStrip />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-primary" />
                  {deliveryEstimate}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-primary" />
                  {soldToday} people bought this in the last 24 hours
                </span>
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

            {selectedVariant && (
              <div className="flex items-center gap-2 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full ${selectedVariant.available ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <span className={isLowStock ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {stockLabel}
                </span>
              </div>
            )}

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
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={!selectedVariant?.available}
              >
                <ShoppingCart size={18} className="mr-2" />
                {selectedVariant?.available ? 'Add to Bag — Secure Checkout' : 'Out of Stock'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {remainingForFreeShipping > 0
                  ? `Add ${formatPrice(remainingForFreeShipping)} more for free shipping`
                  : 'Free shipping applied'}
              </p>
            </div>
            
            {/* Payment Trust Block */}
            <PaymentTrustBlock />

            {/* Features & Trust Markers */}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Truck size={18} className="text-primary" />
                <div>
                  <span className="font-medium block">Free delivery over {formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
                  <span className="text-muted-foreground text-xs">Singapore always ships free; other countries reach the threshold</span>
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

        {/* Product FAQ */}
        <div className="mt-16">
          <ProductFaq />
        </div>

        {/* Instagram Feed / Shop the Look */}
        <div className="mt-20">
          <InstagramFeed />
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
          countryCode={countryCode}
        />
      </div>
    </Layout>
  );
};

export default ProductDetail;
