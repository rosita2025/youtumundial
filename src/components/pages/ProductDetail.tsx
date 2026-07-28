import { useEffect, useState } from 'react';
import { useParams, Link } from '@/lib/router-compat';
import { Layout } from '@/components/layout/Layout';
import { ProductGallery } from '@/components/product/ProductGallery';
import { VariantSelector } from '@/components/product/VariantSelector';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { getProduct, getRelatedProducts } from '@/lib/data/data-provider';
import { Product, ProductVariant } from '@/lib/data/types';
import { formatPrice, calculateDiscount } from '@/lib/utils/format';
import { ProductReviews } from '@/components/product/ProductReviews';
import { StarRating } from '@/components/product/StarRating';
import { useReviewSummary } from '@/lib/reviews/use-reviews';
import { ReviewDiagnostics } from '@/components/product/ReviewDiagnostics';
import { Minus, Plus, Truck, RotateCcw, Shield } from 'lucide-react';

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const reviewSummary = useReviewSummary(product?.slug ?? slug ?? '');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowDiagnostics(params.get('debug') === '1' || params.get('diag') === '1');
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      setLoading(true);
      const prod = await getProduct(slug);
      if (prod) {
        setProduct(prod);
        // Select first available variant
        const firstAvailable = prod.variants.find((v) => v.available) || prod.variants[0];
        setSelectedVariant(firstAvailable);
        
        const related = await getRelatedProducts(prod, 4);
        setRelatedProducts(related);
      }
      setLoading(false);
    }
    loadData();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    addToCart(product, selectedVariant, quantity);
    setQuantity(1);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container-wide py-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
              <div className="h-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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
              <h1 className="font-heading text-3xl md:text-4xl font-medium">
                {product.title}
              </h1>
              {reviewSummary.total > 0 && (
                <a href="#resenas" className="mt-2 inline-flex items-center gap-2 text-sm">
                  <StarRating rating={reviewSummary.average} size={15} />
                  <span className="text-muted-foreground underline-offset-4 hover:underline">
                    {reviewSummary.average.toFixed(1)} · {reviewSummary.total} reseñas
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

            {/* Features */}
            <div className="pt-6 border-t border-border space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Truck size={18} className="text-muted-foreground" />
                <span>Free shipping on orders over $100</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <RotateCcw size={18} className="text-muted-foreground" />
                <span>Free 30-day returns</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield size={18} className="text-muted-foreground" />
                <span>2-year warranty included</span>
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
      </div>
    </Layout>
  );
};

export default ProductDetail;
