import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  // El banner es sticky, pero podríamos querer ocultarlo al scrollear mucho (opcional)
  // Por ahora lo dejamos fijo arriba como pidió el usuario para mejorar conversión.

  return (
    <div className={cn(
      "w-full bg-[#00D66F] text-black py-2.5 px-4 text-center text-xs md:text-sm font-bold sticky top-0 z-[60] shadow-md transition-all duration-300",
      !isVisible && "hidden"
    )}>
      <div className="container-wide flex items-center justify-center gap-2 md:gap-4 flex-wrap">
        <span>
          Enjoy 5% off for your first order. Use code <span className="underline decoration-2">WELCOME5</span>
        </span>
        <span className="hidden md:inline opacity-30">|</span>
        <span>
          Free shipping on orders over $45 worldwide
        </span>
      </div>
    </div>
  );
}
