import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Hero } from '@/components/home/Hero';
import { FeaturedCollections } from '@/components/home/FeaturedCollections';
import { TrendingProducts } from '@/components/home/TrendingProducts';
import { Newsletter } from '@/components/home/Newsletter';
import { getCollections, getFeaturedProducts, getNewArrivals } from '@/lib/data/data-provider';
import { Collection, Product } from '@/lib/data/types';

const Index = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [cols, featured, arrivals] = await Promise.all([
        getCollections(),
        getFeaturedProducts(8),
        getNewArrivals(4),
      ]);
      setCollections(cols);
      setFeaturedProducts(featured);
      setNewArrivals(arrivals);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Hero />
      <FeaturedCollections collections={collections} />
      <TrendingProducts
        products={featuredProducts}
        title="Trending Now"
        subtitle="Our most popular picks this season"
      />
      <TrendingProducts
        products={newArrivals}
        title="New Arrivals"
        subtitle="Fresh styles just landed"
        viewAllLink="/collections/new-arrivals"
      />
      <Newsletter />
    </Layout>
  );
};

export default Index;
