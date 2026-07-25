import { useEffect, useState } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProducts, getCollections } from '@/lib/data/data-provider';
import { Product, Collection, SortOption } from '@/lib/data/types';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A-Z' },
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const currentCollection = searchParams.get('collection') || '';
  const currentSort = (searchParams.get('sort') as SortOption) || 'featured';

  useEffect(() => {
    async function loadData() {
      const [prods, cols] = await Promise.all([
        getProducts(
          currentCollection ? { collection: currentCollection } : undefined,
          currentSort
        ),
        getCollections(),
      ]);
      setProducts(prods);
      setCollections(cols);
      setLoading(false);
    }
    loadData();
  }, [currentCollection, currentSort]);

  const handleSortChange = (value: SortOption) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', value);
    setSearchParams(params);
  };

  const handleCollectionChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('collection', value);
    } else {
      params.delete('collection');
    }
    setSearchParams(params);
  };

  return (
    <Layout>
      <div className="container-wide py-8 md:py-12">
        <Breadcrumbs items={[{ label: 'All Products' }]} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="heading-section">All Products</h1>
            <p className="text-muted-foreground mt-1">
              {products.length} products
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Collection Filter */}
            <Select
              value={currentCollection || 'all'}
              onValueChange={handleCollectionChange}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collections</SelectItem>
                {collections.map((col) => (
                  <SelectItem key={col.id} value={col.slug}>
                    {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={currentSort} onValueChange={handleSortChange}>
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
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-muted rounded-lg" />
                <div className="mt-4 h-4 bg-muted rounded w-3/4" />
                <div className="mt-2 h-4 bg-muted rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </Layout>
  );
};

export default Products;
