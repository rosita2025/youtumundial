import { Link } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-secondary/30">
      <div className="container-wide py-16 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-6 animate-fade-up">
            <span className="inline-block text-sm font-medium text-primary tracking-wide uppercase">
              New Season Collection
            </span>
            <h1 className="heading-display text-balance">
              Thoughtfully made essentials for everyday life
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Discover our curated collection of sustainable clothing and accessories. 
              Designed for comfort, built to last, and made with the planet in mind.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button size="lg" asChild>
                <Link to="/products">
                  Shop Collection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/collections/new-arrivals">New Arrivals</Link>
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative animate-fade-up stagger-2">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-hover">
              <img
                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1000&fit=crop"
                alt="Model wearing sustainable clothing"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-background rounded-xl shadow-soft p-4 max-w-[200px]">
              <p className="text-sm font-medium">100% Sustainable</p>
              <p className="text-xs text-muted-foreground mt-1">
                Made from recycled and organic materials
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
