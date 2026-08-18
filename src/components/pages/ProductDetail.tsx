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
import { Minus, Plus, Truck, RotateCcw, Shield, ShoppingCart, Heart, Gem, Gift } from 'lucide-react';
import { StickyAddToCart } from '@/components/product/StickyAddToCart';
import { UpsellSection } from '@/components/product/UpsellSection';
import { cn } from '@/lib/utils';

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
                {product.slug === 'lion-shaped-pet-canvas-shoulder-bag' ? 'Cozy Pet Carrier Tote Bag - Cute Costume Series' : product.title}
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
                <div className="mt-2 flex items-center gap-3">
                  <a href="#reviews" className="inline-flex items-center gap-2 text-sm">
                    <StarRating rating={reviewSummary.average} size={15} />
                    <span className="text-muted-foreground underline-offset-4 hover:underline font-medium">
                      {reviewSummary.average.toFixed(1)} ({reviewSummary.total} Reviews)
                    </span>
                  </a>
                  <span className="h-4 w-[1px] bg-border" />
                  <span className="text-xs font-bold text-green-600 flex items-center gap-1 uppercase tracking-tighter">
                    <Shield size={12} /> Verified Product
                  </span>
                </div>
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

            <div className="flex flex-col gap-1.5 py-1">
              <span className="text-2xl font-heading font-bold text-foreground">
                {quantity === 1 ? formatPrice(43.99) : quantity === 2 ? formatPrice(69.99) : formatPrice(89.99)}
              </span>
              <ul className="space-y-2.5">
                {[
                  '100% Breathable & Soft Premium Canvas (Ultra-comfortable for pets up to 15 lbs / 7 kg).',
                  'Safe & Secure Head Opening with plush costume hood to prevent jumping out.',
                  'Hands-Free Ergonomic Design for stress-free daily walks and outdoor trips.'
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] text-muted-foreground leading-snug">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Variant Selector */}
            <VariantSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelect={setSelectedVariant}
            />

            {/* Bundle & Save Section */}
            <div className="space-y-3 pt-2">
              <label className="text-sm font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-2">
                <Gift size={16} className="text-primary" />
                Bundle & Save
              </label>
              <div className="grid gap-3">
                {[
                  { qty: 1, price: 43.99, label: 'Buy 1 - Standard', badge: null, sublabel: 'Free Shipping Included' },
                  { qty: 2, price: 69.99, label: 'Buy 2 - Double Pack', badge: 'MOST POPULAR', sublabel: '$35.00 each | Save 20%' },
                  { qty: 3, price: 89.99, label: 'Buy 3 - Triple Pack', badge: 'BEST VALUE', sublabel: '$30.00 each | Save 31%' },
                ].map((offer) => (
                  <button
                    key={offer.qty}
                    onClick={() => setQuantity(offer.qty)}
                    className={cn(
                      "relative flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                      quantity === offer.qty 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border bg-background hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        quantity === offer.qty ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}>
                        {quantity === offer.qty && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="font-bold text-sm block">{offer.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {offer.sublabel}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-heading text-lg font-bold block">{formatPrice(offer.price)}</span>
                      {offer.badge && (
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full",
                          offer.qty === 2 ? "bg-yellow-400 text-black" : "bg-primary text-white"
                        )}>
                          {offer.badge}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Add to Cart with Urgency */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-600 animate-pulse">
                <Shield size={12} />
                Only 18 left in stock - Selling fast!
              </div>
              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold shadow-xl transition-all active:scale-95 bg-[#FFB800] hover:bg-[#FFB800]/90 text-black border-none"
                onClick={handleAddToCart}
                disabled={!selectedVariant?.available}
              >
                {selectedVariant?.available ? 'ADD TO CART' : 'OUT OF STOCK'}
              </Button>
            </div>

            {/* Trust Badges for Conversion */}
            <div className="flex flex-col items-center gap-3 py-2 border-y border-border/50">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Guaranteed Safe Checkout</span>
              <div className="flex items-center justify-center gap-5 opacity-70 relative select-none">
                <div className="relative">
                  <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-6 w-auto pointer-events-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                  <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
                </div>
                <div className="relative">
                  <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-6 w-auto pointer-events-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                  <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
                </div>
                <div className="relative">
                  <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-6 w-auto pointer-events-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                  <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
                </div>
                <div className="relative">
                  <img src="https://img.icons8.com/color/48/apple-pay.png" alt="Apple Pay" className="h-6 w-auto pointer-events-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                  <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
                </div>
                <div className="relative">
                  <img src="https://img.icons8.com/color/48/google-pay.png" alt="Google Pay" className="h-6 w-auto pointer-events-none" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                  <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
                </div>
              </div>
            </div>

            {/* Info Accordions */}
            <div className="space-y-1">
              {[
                { 
                  title: 'Product Details & Sizing', 
                  icon: <Gem size={16} />,
                  content: 'Our Cozy Pet Carrier is crafted from ultra-soft, breathable cotton canvas. Sizing: M (up to 3kg/6lbs), L (up to 6kg/13lbs). Features a secure internal harness clip and adjustable neck opening for max comfort.'
                },
                { 
                  title: 'Shipping & Delivery', 
                  icon: <Truck size={16} />,
                  content: 'We offer FREE worldwide shipping on all orders. Preparation time: 3-4 days. Estimated delivery: 10-15 business days depending on location. Tracking number provided via email.'
                },
                { 
                  title: '30-Day Money-Back Guarantee', 
                  icon: <Shield size={16} />,
                  content: 'We stand behind our products. If you and your pet are not 100% happy with your purchase, we offer a hassle-free refund within 30 days of delivery. No questions asked.'
                }
              ].map((item, idx) => (
                <div key={idx} className="border-b border-border/50 last:border-none">
                  <button 
                    className="w-full py-4 flex items-center justify-between text-left group"
                    onClick={(e) => {
                      const content = e.currentTarget.nextElementSibling;
                      content?.classList.toggle('hidden');
                      e.currentTarget.querySelector('svg:last-child')?.classList.toggle('rotate-180');
                    }}
                  >
                    <span className="flex items-center gap-3 text-sm font-medium">
                      <span className="text-primary">{item.icon}</span>
                      {item.title}
                    </span>
                    <Plus size={14} className="text-muted-foreground transition-transform duration-200" />
                  </button>
                  <div className="hidden pb-4 text-xs text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-1">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Upsell Section */}
            <UpsellSection product={product} relatedProducts={relatedProducts} />
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
