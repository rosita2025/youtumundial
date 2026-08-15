/**
/**
 * Utilidades para geolocalización y detección de IP en el checkout.
 *
 * Se usa para pre-seleccionar el país de destino del cliente basado en su IP
 * y para validar la coherencia de los datos geográficos.
 */
import { createServerFn } from '@tanstack/react-start';

export interface GeoLocation {
  countryCode: string | null;
  ip: string | null;
}

/**
 * Detecta el país del visitante por su dirección IP.
 *
 * Utiliza los headers estándar de Cloudflare/Vercel (cf-ipcountry) que
 * el runtime de Lovable inyecta en la petición. Si no hay headers, cae
 * a una API de geolocalización externa de respaldo.
 */
export const detectVisitorGeo = createServerFn({ method: 'GET' }).handler(
  async ({ request }): Promise<GeoLocation> => {
    const req = request as unknown as Request;
    const cfCountry = req.headers.get('cf-ipcountry');
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for');


    if (cfCountry && cfCountry !== 'XX') {
      return {
        countryCode: cfCountry.toUpperCase(),
        ip: ip ? ip.split(',')[0].trim() : null,
      };
    }

    // 2. Respaldo: API externa (ipapi.co o similar)
    // Solo si el header falla, hacemos una petición externa.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        if (data.country_code) {
          return {
            countryCode: data.country_code.toUpperCase(),
            ip: data.ip || null
          };
        }
      }
    } catch (error) {
      console.warn('Geo IP fallback failed:', (error as Error).message);
    }

    return { countryCode: null, ip: null };
  }
);
