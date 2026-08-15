import { ReactNode } from 'react';
import { Link } from '@/lib/router-compat';
import { Logo } from '@/components/layout/Logo';
import { Lock } from 'lucide-react';

export function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Lock className="h-3.5 w-3.5" /> Secure Checkout
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto md:px-4">{children}</main>

      <footer className="bg-[#F5F5F5] py-8 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-gray-500 uppercase tracking-wider justify-center md:justify-start">
          <Link to="/privacy" className="hover:underline transition-all">Privacidad</Link>
          <Link to="/terms" className="hover:underline transition-all">Términos</Link>
          <Link to="/shipping" className="hover:underline transition-all">Envíos</Link>
          <Link to="/contact" className="hover:underline transition-all">Contacto</Link>
        </div>
      </footer>
    </div>
  );
}
