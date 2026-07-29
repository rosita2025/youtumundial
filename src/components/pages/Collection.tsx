import { useEffect, useState } from 'react';
import { useParams } from '@/lib/router-compat';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCollection, getCollectionProducts } from '@/lib/data/data-provider';
import { Collection as CollectionType, Product, SortOption } from '@/lib/data/types';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A-Z' },
];

const Collection = () => {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<CollectionType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sort, setSort] = useState<SortOption>('featured');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!slug) return;
      setLoading(true);
      const [col, prods] = await Promise.all([
        getCollection(slug),
        getCollectionProducts(slug, sort),
      ]);
      setCollection(col);
      setProducts(prods);
      setLoading(false);
    }
    loadData();
  }, [slug, sort]);

  if (loading) {
    return (
      <Layout>
        <div className="container-wide py-8">
          <div className="h-64 bg-muted rounded-xl animate-pulse mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-lg" />
                <div className="mt-4 h-4 bg-muted rounded w-3/4" />
                <div className="mt-2 h-4 bg-muted rounded w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!collection) {
    return (
      <Layout>
        <div className="container-wide py-16 text-center">
          <h1 className="text-2xl font-medium">Collection not found</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Collection Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={collection.image.url}
          alt={collection.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/40" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div className="text-primary-foreground">
            <h1 className="font-heading text-4xl md:text-5xl font-medium">
              {collection.title}
            </h1>
            <p className="mt-3 text-primary-foreground/80 max-w-lg mx-auto px-4">
              {collection.description}
            </p>
          </div>
        </div>
      </div>

      <div className="container-wide py-8 md:py-12">
        <Breadcrumbs
          items={[
            { label: 'Collections', href: '/products' },
            { label: collection.title },
          ]}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <p className="text-muted-foreground">
            {products.length} products
          </p>

          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ProductGrid products={products} />
      </div>
    </Layout>
  );
};

export default Collection;
