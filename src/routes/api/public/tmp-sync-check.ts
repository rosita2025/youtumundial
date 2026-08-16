import { createFileRoute } from '@tanstack/react-router';

/** Ruta temporal de verificación de sincronización (se elimina tras la prueba). */
export const Route = createFileRoute('/api/public/tmp-sync-check')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sku = url.searchParams.get('sku') ?? '';
        const { createShopifyOrder } = await import('@/lib/shopify/admin.server');
        const result = await createShopifyOrder({
          reference: `TEST-${Date.now()}`,
          email: 'prueba.sync@youtumundial.com',
          name: 'Prueba Sync',
          phone: '+51999888777',
          currency: 'USD',
          address: {
            line1: 'Av. Prueba 123',
            city: 'Lima',
            postal_code: '15001',
            country: 'PE',
          },
          lines: [{ title: 'Prueba de sincronización', quantity: 1, price: 1, sku }],
          extraTags: ['pedido-prueba', 'diagnostico'],
        } as any);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
