import { useState } from 'react';
import { useParams } from '@/lib/router-compat';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { selectCollections, selectProducts } from '@/lib/data/data-provider';
import { Product, SortOption } from '@/lib/data/types';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A-Z' },
];

interface CollectionProps {
  catalog?: Product[];
}

const Collection = ({ catalog = [] }: CollectionProps) => {
  const { slug } = useParams<{ slug: string }>();
  const [sort, setSort] = useState<SortOption>('featured');

  const collection = selectCollections(catalog).find((c) => c.slug === slug) ?? null;
  const products = selectProducts(catalog, { collection: slug }, sort);

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
      <div className="relative h-64 md:h-80 overflow-hidden select-none">
        <img
          src={collection.image.url}
          alt={collection.title}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
        <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
        <div className="absolute inset-0 bg-foreground/40 pointer-events-none" />
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
