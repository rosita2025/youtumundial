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
import { FREE_SHIPPING_THRESHOLD } from '@/lib/checkout/config';

import { selectRelatedProducts } from '@/lib/data/data-provider';
import { Product, ProductVariant } from '@/lib/data/types';
import { formatPrice, calculateDiscount } from '@/lib/utils/format';
import { ProductReviews } from '@/components/product/ProductReviews';
import { StarRating } from '@/components/product/StarRating';
import { useReviewSummary } from '@/lib/reviews/use-reviews';
import { ReviewDiagnostics } from '@/components/product/ReviewDiagnostics';
import { Minus, Plus, Truck, RotateCcw, Shield, ShoppingCart, Heart, Gem, Gift, ChevronDown, CheckCircle2, Sparkles } from 'lucide-react';
import { StickyAddToCart } from '@/components/product/StickyAddToCart';
import { UpsellSection } from '@/components/product/UpsellSection';
import { ProductCareGuarantee } from '@/components/product/ProductCareGuarantee';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import benefitCatBag from '@/assets/benefit-cat-bag.jpg.asset.json';
import benefitDogBag from '@/assets/benefit-dog-bag.webp.asset.json';


interface ProductDetailProps {
  catalog?: Product[];
}

const ProductDetail = ({ catalog = [] }: ProductDetailProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();
  const product = catalog.find((p) => p.slug === slug) ?? null;
  const relatedProducts = product ? selectRelatedProducts(catalog, product, 4) : [];
  
  const [variantId, setVariantId] = useState<string | null>(null);
  const [bundleSize, setBundleSize] = useState(1);
  const [bundleSelections, setBundleSelections] = useState<string[]>([]);
  const [addLeash, setAddLeash] = useState(false);
  
  const reviewSummary = useReviewSummary(product?.slug ?? slug ?? '');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Initialize bundle selections when bundle size changes
  useEffect(() => {
    if (product && bundleSize > 1) {
      const defaultVariantId = product.variants.find(v => v.available)?.id || product.variants[0]?.id;
      setBundleSelections(Array(bundleSize).fill(defaultVariantId));
    } else {
      setBundleSelections([]);
    }
  }, [bundleSize, product]);

  const selectedVariant: ProductVariant | null = product
    ? product.variants.find((v) => v.id === variantId) ??
      product.variants.find((v) => v.available) ??
      product.variants[0] ??
      null
    : null;
    
  const setSelectedVariant = (variant: ProductVariant) => {
    setVariantId(variant.id);
    window.dispatchEvent(new CustomEvent('product-variant-changed', { detail: { variant } }));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowDiagnostics(params.get('debug') === '1' || params.get('diag') === '1');
  }, []);

  useEffect(() => {
    setVariantId(null);
    setBundleSize(1);
    setAddLeash(false);
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
    
    // Bundle metadata
    const metadata = bundleSize > 1 ? {
      isBundle: true,
      bundleSize,
      selections: bundleSelections.map(id => product.variants.find(v => v.id === id))
    } : null;

    fbEvent.track('AddToCart', {
      content_name: product.title,
      content_ids: [product.id],
      content_type: 'product',
      value: (bundleSize > 1 ? (bundleSize === 2 ? 69.99 : 89.99) : product.price),
      currency: 'USD'
    });

    addToCart(product, selectedVariant, bundleSize, metadata);

    // Add leash upsell if checked
    if (addLeash) {
      // Mock leash product
      const leashProduct: Product = {
        id: 'upsell-leash-harness',
        slug: 'matching-pet-safety-leash-harness',
        title: 'Matching Pet Safety Leash & Harness',
        description: 'Complete safety set for your pet carrier.',
        price: 9.99,
        images: [{ id: 'leash-img', url: 'https://images.unsplash.com/photo-1591768793355-74d7cbad7c34?q=80&w=200', altText: 'Leash', width: 200, height: 200 }],
        variants: [{ id: 'leash-v1', title: 'Standard', price: 9.99, available: true, sku: 'LEASH-001', options: [] }],
        collections: ['accessories'],
        tags: ['upsell'],
        available: true,
        createdAt: new Date().toISOString()
      };
      addToCart(leashProduct, leashProduct.variants[0], 1);
    }
  };

  const updateBundleSelection = (index: number, vId: string) => {
    const newSelections = [...bundleSelections];
    newSelections[index] = vId;
    setBundleSelections(newSelections);
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
      <div className="container-wide py-8 md:py-12 px-4 md:px-0 max-w-full box-border overflow-x-hidden main-product-wrapper">
        <Breadcrumbs
          items={[
            { label: 'Products', href: '/products' },
            { label: product.title },
          ]}
        />

        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 product-single">
          <ProductGallery images={product.images} productTitle={product.title} />

          <div className="space-y-4 md:space-y-6">
            <div className="space-y-1">
              {(product.vendor || product.productType) && (
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {[product.vendor, product.productType].filter(Boolean).join(' · ')}
                </p>
              )}
              <h1 className="font-heading text-3xl md:text-4xl font-medium w-full break-words">
                {product.slug === 'lion-shaped-pet-canvas-shoulder-bag' ? 'Cozy Pet Carrier Tote Bag - Cute Costume Series' : product.title.replace('Brags', 'Bags').replace('Bee Shaped Pet & Cat Bags', 'Bee Shaped Pet & Cat Bags')}
              </h1>
              <div className="mt-2 flex items-center flex-wrap gap-2 md:gap-3">
                {reviewSummary.total > 0 && (
                  <a href="#reviews" className="inline-flex items-center gap-2 text-sm shrink-0">
                    <StarRating rating={reviewSummary.average} size={15} />
                    <span className="text-muted-foreground underline-offset-4 hover:underline font-medium">
                      {reviewSummary.average.toFixed(1)} ({reviewSummary.total} Reviews)
                    </span>
                  </a>
                )}
                <span className="hidden md:block h-4 w-[1px] bg-border" />
                <span className="text-xs font-bold text-green-600 flex items-center gap-1 uppercase tracking-tighter shrink-0">
                  <Shield size={12} /> Verified Product
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
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

            <div className="pt-2">
              <VariantSelector
                variants={product.variants}
                selectedVariant={selectedVariant}
                onSelect={setSelectedVariant}
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-2">
                <Gift size={16} className="text-primary" />
                Bundle & Save
              </label>
              <div className="grid gap-3">
                {[
                  { qty: 1, price: 43.99, label: 'Buy 1', badge: null, sublabel: '+ Standard International Shipping' },
                  { qty: 2, price: 69.99, label: 'Buy 2 - Double Pack', badge: 'MOST POPULAR', sublabel: '$35.00/ea + FREE International Shipping [Save $17.99]' },
                  { qty: 3, price: 89.99, label: 'Buy 3 - Triple Pack', badge: 'BEST VALUE', sublabel: '$30.00/ea + FREE International Shipping [Save $41.98]' },
                ].map((offer) => (

                  <div key={offer.qty} className={cn("space-y-0 w-full relative", offer.qty > 1 && "mt-3.5")}>
                    <button
                      onClick={() => setBundleSize(offer.qty)}
                      className={cn(
                        "relative w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left overflow-visible",
                        bundleSize === offer.qty 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border bg-background hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          bundleSize === offer.qty ? "border-primary bg-primary" : "border-muted-foreground/30"
                        )}>
                          {bundleSize === offer.qty && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <span className="font-bold text-sm block">{offer.label}</span>
                          <span className="text-xs text-muted-foreground">{offer.sublabel}</span>
                        </div>
                      </div>
                      <div className="text-right pr-3">
                        <span className="font-heading text-lg font-bold block">{formatPrice(offer.price)}</span>
                      </div>
                      {offer.badge && (
                        <div className="absolute top-[-12px] right-4 z-10">
                          <span className={cn(
                            "text-[11px] font-bold uppercase tracking-[0.5px] px-[10px] py-[4px] rounded-[4px] shadow-sm border border-white/20",
                            offer.qty === 2 ? "bg-[#FFB800] text-black" : "bg-[#1B4D3E] text-white"
                          )}>
                            {offer.badge}
                          </span>
                        </div>
                      )}
                    </button>
                    
                    {bundleSize === offer.qty && offer.qty > 1 && (
                      <div className="mt-2 ml-8 space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                        {Array.from({ length: offer.qty }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase min-w-[50px]">Bag #{i + 1}:</span>
                            <div className="relative flex-1">
                              <select 
                                value={bundleSelections[i] || ''}
                                onChange={(e) => updateBundleSelection(i, e.target.value)}
                                className="w-full h-[36px] bg-background border border-border rounded-md px-3 py-1 text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-primary pr-8"
                              >
                                {product.variants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.title}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                <ChevronDown size={14} />
                              </div>
                            </div>
                            {/* Tiny Thumbnail */}
                            {(() => {
                              const selVariant = product.variants.find(v => v.id === bundleSelections[i]);
                              const imgUrl = selVariant?.image?.url || product.images[0]?.url;
                              return (
                                <div className="h-8 w-8 rounded bg-muted overflow-hidden border border-border/50">
                                  <img src={imgUrl} alt="Variant" className="h-full w-full object-cover" />
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Free Shipping Progress Bar */}
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
                  {bundleSize > 1 ? (
                    <span className="text-green-600 flex items-center gap-1.5">
                      <Sparkles size={12} className="animate-pulse" />
                      🎉 CONGRATS! You unlocked FREE International Shipping!
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      🚚 Add $6.01 more to unlock FREE International Shipping!
                    </span>
                  )}
                  <span className="text-muted-foreground">{bundleSize > 1 ? '100%' : '88%'}</span>
                </div>
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-700 ease-out rounded-full",
                      bundleSize > 1 ? "bg-green-500 w-full" : "bg-primary w-[88%]"
                    )}
                  />
                </div>
                {bundleSize === 1 && (
                  <p className="mt-2 text-[10px] text-center text-muted-foreground italic font-medium">
                    Add 1 more item or select Buy 2 to unlock FREE International Shipping!
                  </p>
                )}
              </div>



              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold shadow-xl transition-all active:scale-95 bg-[#FFB800] hover:bg-[#FFB800]/90 text-black border-none mt-4"
                onClick={handleAddToCart}
                disabled={!selectedVariant?.available}
              >
                {selectedVariant?.available ? 'ADD TO CART' : 'OUT OF STOCK'}
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3 py-2 border-y border-border/50">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Guaranteed Safe Checkout</span>
              <div className="flex items-center justify-center gap-5 opacity-70 relative select-none">
                {['visa', 'mastercard', 'paypal', 'apple-pay', 'google-pay'].map(card => (
                  <div key={card} className="relative">
                    <img src={`https://img.icons8.com/color/48/${card}.png`} alt={card} className="h-6 w-auto pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits & Features Section */}
            <div className="py-6 border-t border-border/50 space-y-6">
              <h3 className="font-heading text-xl font-bold text-center mb-6">Why You & Your Pet Will Love It</h3>
              
              {/* Product Photos / Highlights */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="aspect-square rounded-2xl overflow-hidden border border-border shadow-sm">
                  <img src={benefitCatBag.url} alt="Cat riding safely in the canvas shoulder bag" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden border border-border shadow-sm">
                  <img src={benefitDogBag.url} alt="Small dog wearing plush costume inside the tote bag" loading="lazy" className="w-full h-full object-cover" />

                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">🌿</div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Stress-Free Head Cutout</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Allows pets to breathe freely and enjoy the outdoor view, reducing travel anxiety.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">🔒</div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Anti-Escape Security</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Adjustable soft collar opening keeps your pet safely tucked inside with zero risk of jumping out.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">🎒</div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Ergonomic Hands-Free</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Wide, sturdy canvas straps evenly distribute weight for comfortable walks and coffee runs.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">📸</div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Viral-Ready Plush</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Cute 3D plush details make your pet the center of attention wherever you go.</p>
                  </div>
                </div>
              </div>
            </div>

            <UpsellSection product={product} relatedProducts={relatedProducts} />

          </div>
        </div>

        <ProductReviews 
          slug={product.slug} 
          selectedVariant={selectedVariant}
          onAddToCart={handleAddToCart}
        />

        {showDiagnostics && <ReviewDiagnostics slug={product.slug} />}

        <ProductCareGuarantee />

        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h2 className="heading-section mb-8">You May Also Like</h2>
            <ProductGrid products={relatedProducts} />
          </section>
        )}

        <StickyAddToCart 
          product={product} 
          selectedVariant={selectedVariant}
          quantity={bundleSize}
          onAdd={handleAddToCart}
        />
      </div>
    </Layout>
  );
};

export default ProductDetail;
