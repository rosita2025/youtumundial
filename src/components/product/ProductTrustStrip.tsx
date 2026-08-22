import { Truck, ShieldCheck, RotateCcw, Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductTrustStripProps {
  className?: string;
  compact?: boolean;
}

const items = [
  { icon: Truck, label: 'Free shipping over $45', short: 'Free shipping' },
  { icon: Clock, label: 'Ships in 3-4 business days', short: 'Fast dispatch' },
  { icon: RotateCcw, label: '30-day easy returns', short: 'Easy returns' },
  { icon: ShieldCheck, label: 'Secure SSL checkout', short: 'SSL secure' },
];

export function ProductTrustStrip({ className, compact = false }: ProductTrustStripProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2',
        compact ? 'gap-x-3 gap-y-1.5' : '',
        className
      )}
    >
      {items.map(({ icon: Icon, label, short }) => (
        <div
          key={label}
          className={cn(
            'flex items-center gap-1.5 text-muted-foreground',
            compact ? 'text-[10px]' : 'text-xs'
          )}
          title={label}
        >
          <Icon size={compact ? 12 : 14} className="text-primary shrink-0" />
          <span>{compact ? short : label}</span>
        </div>
      ))}
    </div>
  );
}

export function PaymentTrustBlock({ className }: { className?: string }) {
  return (
    <div className={cn('border border-border rounded-lg p-4 bg-card/50', className)}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <Lock size={12} className="text-primary" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
          Guaranteed Safe Checkout
        </span>
      </div>

      <div className="flex items-center justify-center flex-wrap gap-3 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
        <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-6 w-auto" />
        <img
          src="https://img.icons8.com/color/48/mastercard.png"
          alt="Mastercard"
          className="h-6 w-auto"
        />
        <img
          src="https://img.icons8.com/color/48/american-express.png"
          alt="American Express"
          className="h-6 w-auto"
        />
        <img
          src="https://img.icons8.com/color/48/paypal.png"
          alt="PayPal"
          className="h-6 w-auto"
        />
        <img
          src="https://img.icons8.com/color/48/apple-pay.png"
          alt="Apple Pay"
          className="h-6 w-auto"
        />
        <img
          src="https://img.icons8.com/color/48/google-pay.png"
          alt="Google Pay"
          className="h-6 w-auto"
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Lock size={10} className="text-primary" /> 256-bit SSL encrypted
        </span>
        <span className="flex items-center gap-1">
          <RotateCcw size={10} className="text-primary" /> 7-day money-back guarantee
        </span>
      </div>
    </div>
  );
}
