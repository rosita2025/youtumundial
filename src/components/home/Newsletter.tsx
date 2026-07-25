import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    setEmail('');
    toast.success('Thanks for subscribing! Check your inbox for 15% off.');
  };

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container-wide py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-medium">
            Join the Evergreen Community
          </h2>
          <p className="mt-4 text-primary-foreground/80 text-lg">
            Subscribe to receive exclusive offers, early access to new collections, 
            and 15% off your first order.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:border-primary-foreground"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={loading}
              className="shrink-0"
            >
              {loading ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-primary-foreground/60">
            No spam, unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
