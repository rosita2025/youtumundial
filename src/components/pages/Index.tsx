import { Layout } from '@/components/layout/Layout';
import { Hero } from '@/components/home/Hero';
import { FeaturedCollections } from '@/components/home/FeaturedCollections';
import { TrendingProducts } from '@/components/home/TrendingProducts';
import { Newsletter } from '@/components/home/Newsletter';
import { selectCollections, selectProducts } from '@/lib/data/data-provider';
import { Product } from '@/lib/data/types';

interface IndexProps {
  catalog?: Product[];
}

const Index = ({ catalog = [] }: IndexProps) => {
  const collections = selectCollections(catalog);
  const featuredProducts = selectProducts(catalog).slice(0, 8);
  const newestFirst = selectProducts(catalog, undefined, 'newest');
  const tagged = selectProducts(catalog, { collection: 'new-arrivals' }, 'newest');
  const newArrivals = (tagged.length > 0 ? tagged : newestFirst).slice(0, 4);

  return (
    <Layout>
      <Hero />
      {collections.length > 0 && <FeaturedCollections collections={collections} />}
      {featuredProducts.length > 0 && (
        <TrendingProducts
          products={featuredProducts}
          title="Trending Now"
          subtitle="Our most popular picks this season"
        />
      )}
      {newArrivals.length > 0 && (
        <TrendingProducts
          products={newArrivals}
          title="New Arrivals"
          subtitle="Fresh styles just landed"
          viewAllLink="/products"
        />
      )}
      <Newsletter />
    </Layout>
  );
};

export default Index;
