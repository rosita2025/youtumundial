import { Link } from '@/lib/router-compat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Instagram, Twitter, Facebook } from 'lucide-react';

const footerLinks = {
  shop: [
    { label: 'All Products', href: '/products' },
    { label: "Men's Collection", href: '/collections/mens' },
    { label: "Women's Collection", href: '/collections/womens' },
    { label: 'New Arrivals', href: '/collections/new-arrivals' },
    { label: 'Sale', href: '/collections/sale' },
  ],
  help: [
    { label: 'Contact Us', href: '#' },
    { label: 'Shipping & Returns', href: '#' },
    { label: 'FAQ', href: '#' },
    { label: 'Size Guide', href: '#' },
  ],
  company: [
    { label: 'About Us', href: '#' },
    { label: 'Sustainability', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Press', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-secondary/50 border-t border-border">
      <div className="container-wide py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Newsletter */}
          <div className="lg:col-span-2">
            <Link to="/" className="font-heading text-2xl font-semibold">
              Youtumundial
            </Link>
            <p className="mt-4 text-muted-foreground max-w-sm">
              Thoughtfully designed essentials made from sustainable materials. 
              Better for you, better for the planet.
            </p>

            {/* Newsletter */}
            <div className="mt-8">
              <h4 className="font-medium mb-3">Join our newsletter</h4>
              <form className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 bg-background"
                />
                <Button type="submit" variant="default">
                  Subscribe
                </Button>
              </form>
              <p className="text-sm text-muted-foreground mt-2">
                15% off your first order when you sign up.
              </p>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-medium mb-4">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help Links */}
          <div>
            <h4 className="font-medium mb-4">Help</h4>
            <ul className="space-y-3">
              {footerLinks.help.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-medium mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Youtumundial. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={20} />
            </a>
            <a
              href="#"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Twitter"
            >
              <Twitter size={20} />
            </a>
            <a
              href="#"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Facebook"
            >
              <Facebook size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
