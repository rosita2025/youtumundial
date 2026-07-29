/**
 * Catálogo de la tienda cargado en el servidor.
 *
 * Se usa desde los `loader` de las rutas para que el HTML llegue con los
 * productos ya renderizados (sin pantalla "Loading..." en el navegador).
 * El caché vive en el servidor, así que se comparte entre visitantes.
 */
import { createServerFn } from '@tanstack/react-start';
import type { Product } from './types';

export const fetchCatalog = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Product[]> => {
    const { getCatalog } = await import('./data-provider');
    try {
      return await getCatalog();
    } catch {
      return [];
    }
  },
);
