import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const dismissed = localStorage.getItem('announcement-dismissed');
    if (!dismissed) {
      setIsVisible(true);
      document.documentElement.style.setProperty('--announcement-bar-height', '40px');
    } else {
      document.documentElement.style.setProperty('--announcement-bar-height', '0px');
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('announcement-dismissed', 'true');
    document.documentElement.style.setProperty('--announcement-bar-height', '0px');
  };

  if (!isMounted || !isVisible) return null;

  return (
    <div className={cn(
      "w-full bg-[#00D66F] text-black py-2.5 px-4 text-center text-xs md:text-sm font-bold sticky top-0 z-[60] shadow-md transition-all duration-300",
    )}>
      <div className="container-wide flex items-center justify-center relative">
        <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap pr-8">
          <span>
            Enjoy 5% off for your first order. Use code <span className="underline decoration-2">WELCOME5</span>
          </span>
          <span className="hidden md:inline opacity-30">|</span>
          <span>
            Free shipping on orders over $45 worldwide
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="absolute right-0 p-1 hover:opacity-70 transition-opacity"
          aria-label="Dismiss announcement"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

