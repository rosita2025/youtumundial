import { Link } from '@/lib/router-compat';
import { Collection } from '@/lib/data/types';
import { ArrowRight } from 'lucide-react';

interface FeaturedCollectionsProps {
  collections: Collection[];
}

export function FeaturedCollections({ collections }: FeaturedCollectionsProps) {
  // Show first 4 collections
  const featured = collections.slice(0, 4);

  return (
    <section className="container-wide py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="heading-section">Shop by Category</h2>
        <p className="text-muted-foreground mt-2">
          Explore our thoughtfully curated collections
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {featured.map((collection, index) => (
          <Link
            key={collection.id}
            to={`/collections/${collection.slug}`}
            className="group relative aspect-[3/4] rounded-xl overflow-hidden animate-fade-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Image */}
            <img
              src={collection.image.url}
              alt={collection.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-primary-foreground">
              <h3 className="font-heading text-xl font-medium">
                {collection.title}
              </h3>
              <p className="text-sm text-primary-foreground/80 mt-1">
                {collection.productCount} products
              </p>
              <span className="inline-flex items-center text-sm font-medium mt-3 group-hover:underline">
                Shop Now
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
