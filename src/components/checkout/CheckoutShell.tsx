import { ReactNode } from 'react';
import { Link } from '@/lib/router-compat';
import { Logo } from '@/components/layout/Logo';
import { Lock } from 'lucide-react';

/**
 * Shell minimalista tipo Shopify para el checkout: sin menú de cabecera ni
 * footer del sitio, para reducir distracciones y salidas del embudo de pago.
 */
export function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" aria-label="Volver a la tienda">
            <Logo />
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Pago seguro cifrado
          </span>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacidad
          </Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Términos
          </Link>
          <Link to="/shipping" className="hover:text-foreground transition-colors">
            Envíos
          </Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">
            Contacto
          </Link>
        </div>
      </footer>
    </div>
  );
}
