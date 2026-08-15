import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MESSAGES = [
  {
    text: "Enjoy 5% off for your first order. Use code ",
    highlight: "WELCOME5",
    type: "promo"
  },
  {
    text: "Free shipping on orders over $45 worldwide",
    type: "shipping"
  },
  {
    text: "New arrivals synced automatically from our store",
    type: "new"
  }
];

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState<boolean | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Initial check for dismissed state
    const dismissed = localStorage.getItem('announcement-dismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
      document.documentElement.style.setProperty('--announcement-bar-height', '0px');
    } else {
      setIsVisible(true);
      document.documentElement.style.setProperty('--announcement-bar-height', '40px');
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [isVisible, currentMessageIndex]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % MESSAGES.length);
      setIsTransitioning(false);
    }, 300);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentMessageIndex((prev) => (prev - 1 + MESSAGES.length) % MESSAGES.length);
      setIsTransitioning(false);
    }, 300);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('announcement-dismissed', 'true');
    document.documentElement.style.setProperty('--announcement-bar-height', '0px');
  };

  if (isVisible === null || isVisible === false) return null;

  const currentMessage = MESSAGES[currentMessageIndex];

  return (
    <div className={cn(
      "w-full bg-[#00D66F] text-black py-2.5 px-4 text-center text-xs md:text-sm font-bold sticky top-0 z-[60] shadow-md transition-all duration-300",
      isTransitioning ? "opacity-90" : "opacity-100"
    )}>
      <div className="container-wide flex items-center justify-between relative h-5">
        <button
          onClick={handlePrev}
          className="p-1 hover:opacity-70 transition-opacity hidden md:block"
          aria-label="Previous message"
        >
          <ChevronLeft size={16} />
        </button>

        <div 
          className={cn(
            "flex-1 flex items-center justify-center transition-all duration-300 transform",
            isTransitioning ? "opacity-0 translate-y-1 scale-95" : "opacity-100 translate-y-0 scale-100"
          )}
          aria-live="polite"
        >
          <span>
            {currentMessage.text}
            {currentMessage.highlight && (
              <span className="underline decoration-2 ml-1">{currentMessage.highlight}</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleNext}
            className="p-1 hover:opacity-70 transition-opacity hidden md:block"
            aria-label="Next message"
          >
            <ChevronRight size={16} />
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-1 hover:opacity-70 transition-opacity"
            aria-label="Dismiss announcement"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}




