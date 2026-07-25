import { Link } from '@/lib/router-compat';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      {/* Logo Icon */}
      <div className="relative w-8 h-8 md:w-9 md:h-9">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Leaf shape */}
          <path
            d="M20 4C20 4 8 14 8 24C8 30.627 13.373 36 20 36C26.627 36 32 30.627 32 24C32 14 20 4 20 4Z"
            className="fill-primary"
          />
          {/* Stem/vein */}
          <path
            d="M20 12V28M20 16L16 20M20 20L24 24"
            className="stroke-primary-foreground"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {/* Subtle glow effect on hover */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
      </div>

      {/* Brand Name - Hidden on mobile, visible on desktop */}
      <div className="hidden sm:flex flex-col leading-none">
        <span className="font-heading text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Evergreen
        </span>
        <span className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-muted-foreground">
          Lifestyle
        </span>
      </div>
    </Link>
  );
}
