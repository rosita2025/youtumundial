import { useEffect, useState } from 'react';
import { useSearchParams, Link } from '@/lib/router-compat';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchProducts } from '@/lib/data/data-provider';
import { Product } from '@/lib/data/types';
import { Search as SearchIcon } from 'lucide-react';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [inputValue, setInputValue] = useState(query);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function search() {
      if (!query) {
        setProducts([]);
        return;
      }
      setLoading(true);
      const results = await searchProducts(query);
      setProducts(results);
      setLoading(false);
    }
    search();
    setInputValue(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  return (
    <Layout>
      <div className="container-wide py-8 md:py-12">
        <Breadcrumbs items={[{ label: 'Search' }]} />

        <div className="max-w-xl mx-auto mb-12">
          <h1 className="heading-section text-center mb-6">Search Products</h1>
          <form onSubmit={handleSearch} className="flex gap-3">
            <Input
              type="search"
              placeholder="Search for products..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <SearchIcon size={18} />
            </Button>
          </form>
        </div>

        {query && (
          <div className="mb-8">
            <p className="text-muted-foreground">
              {loading
                ? 'Searching...'
                : `${products.length} results for "${query}"`}
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-muted rounded-lg" />
                <div className="mt-4 h-4 bg-muted rounded w-3/4" />
                <div className="mt-2 h-4 bg-muted rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : query ? (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground mb-4">
              No products found for "{query}"
            </p>
            <p className="text-muted-foreground mb-8">
              Try searching for something else or browse our collections.
            </p>
            <Button asChild>
              <Link to="/products">View All Products</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default Search;
