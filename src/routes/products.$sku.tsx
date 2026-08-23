import { createFileRoute, redirect } from '@tanstack/react-router';
import { getProductBySku, getCatalog } from '@/lib/data/data-provider';

export const Route = createFileRoute('/products/$sku')({
  loader: async ({ params }) => {
    // 1. Intentamos buscar por SKU exacto (sincronizado desde Shopify/SUP)
    const res = await getProductBySku(params.sku);
    
    if (res?.product) {
      // Redirigir siempre al slug base del producto para evitar URLs largas o rotas
      throw redirect({
        href: `/products/${res.product.slug}`,
      });
    }

    // 2. Fallback: buscar en el catálogo completo por slug o ID (por si el SKU es el slug)
    const catalog = await getCatalog();
    const productBySlug = catalog.find(p => p.slug === params.sku || p.id === params.sku);
    
    if (productBySlug) {
      throw redirect({
        href: `/products/${productBySlug.slug}`,
      });
    }

    // Si no se encuentra nada, redirigimos a la tienda completa
    throw redirect({ to: '/products' });
  },
});

