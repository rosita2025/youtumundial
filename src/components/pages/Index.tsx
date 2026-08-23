import { Layout } from '@/components/layout/Layout';
import { Hero } from '@/components/home/Hero';
import { FeaturedCollections } from '@/components/home/FeaturedCollections';
import { TrendingProducts } from '@/components/home/TrendingProducts';
import { Newsletter } from '@/components/home/Newsletter';
import { InstagramFeed } from '@/components/home/InstagramFeed';
import { selectCollections, selectProducts } from '@/lib/data/data-provider';
import { Product } from '@/lib/data/types';

interface IndexProps {
  catalog?: Product[];
}

const Index = ({ catalog = [] }: IndexProps) => {
  const collections = selectCollections(catalog);
  // Orden por fecha de publicación en Shopify: lo más nuevo primero.
  const newestFirst = selectProducts(catalog, undefined, 'newest');
  const latestProduct = newestFirst[0] ?? null;
  const newArrivals = newestFirst.slice(0, 4);
  const featuredProducts = selectProducts(catalog).slice(0, 8);

  return (
    <Layout>
      <Hero latestProduct={latestProduct} />
      {newArrivals.length > 0 && (
        <TrendingProducts
          products={newArrivals}
          title="New Arrivals"
          subtitle="The latest products, synced automatically from our store"
          viewAllLink="/products?sort=newest"
        />
      )}
      {collections.length > 0 && <FeaturedCollections collections={collections} />}
      {featuredProducts.length > 0 && (
        <TrendingProducts
          products={featuredProducts}
          title="Trending Now"
          subtitle="Our most popular picks this season"
        />
      )}
      <Newsletter />
    </Layout>
  );
};


export default Index;
