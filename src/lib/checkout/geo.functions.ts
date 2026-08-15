/**
 * Utilidades para geolocalización y detección de IP en el checkout.
 */
import { createServerFn } from '@tanstack/react-start';

export interface GeoLocation {
  countryCode: string | null;
  ip: string | null;
}

/**
 * Detecta el país del visitante por su dirección IP.
 */
export const detectVisitorGeo = createServerFn({ method: 'GET' }).handler(
  async (ctx): Promise<GeoLocation> => {
    try {
      // TanStack Start provee el objeto Request en el contexto del handler
      const request = (ctx as any)?.request as Request | undefined;

      // 1. Detección por headers (Edge runtime)
      const cfCountry = request?.headers?.get('cf-ipcountry') ?? null;
      const ip =
        request?.headers?.get('x-real-ip') ?? request?.headers?.get('x-forwarded-for') ?? null;

      if (cfCountry && cfCountry !== 'XX') {
        return {
          countryCode: cfCountry.toUpperCase(),
          ip: ip ? ip.split(',')[0].trim() : null,
        };
      }

      // 2. Respaldo: API externa
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = (await response.json()) as { country_code?: string; ip?: string };
        return {
          countryCode: data.country_code?.toUpperCase() || null,
          ip: data.ip || null,
        };
      }
    } catch {
      // Silencioso: el checkout continúa sin prefijo detectado.
    }

    return { countryCode: null, ip: null };
  }
);

