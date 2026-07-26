import { Link } from '@/lib/router-compat';
import logoAsset from '@/assets/youtumundial-logo.png.asset.json';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <img
        src={logoAsset.url}
        alt="Youtumundial"
        className="h-7 md:h-9 w-auto object-contain transition-opacity duration-300 group-hover:opacity-80"
      />
      <span className="sr-only">Youtumundial Ropa Oficial</span>
    </Link>
  );
}
