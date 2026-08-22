import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useServerFn } from '@tanstack/react-start';
import { subscribeNewsletter } from '@/lib/marketing/newsletter.functions';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const subscribe = useServerFn(subscribeNewsletter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || loading) return;

    setLoading(true);
    try {
      const result = await subscribe({ data: { email: value } });
      if (result.ok) {
        setEmail('');
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Could not register your email. Please try again later.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container-wide py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-medium">
            Join the Youtumundial Community
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
              aria-label="Email address"
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
