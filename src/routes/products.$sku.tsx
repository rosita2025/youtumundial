import { createFileRoute, redirect } from '@tanstack/react-router';
import { getProductBySku } from '@/lib/data/data-provider';

export const Route = createFileRoute('/products/$sku')({
  loader: async ({ params }) => {
    const res = await getProductBySku(params.sku);
    if (res?.product) {
      throw redirect({
        href: `/products/${res.product.slug}${res.variantId ? `?variant=${res.variantId}` : ''}`,
      });
    }
    // Si no se encuentra el SKU, redirigimos a la tienda completa
    throw redirect({ to: '/products' });
  },
});

