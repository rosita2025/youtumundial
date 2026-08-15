import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const lookupSchema = z.object({
  countryCode: z.string().min(2).max(2),
  postalCode: z.string().min(2).max(12),
});

export type PostalPlace = {
  city: string;
  state: string;
};

export type PostalLookupResult = {
  ok: boolean;
  places: PostalPlace[];
};

/**
 * Resolve city/state suggestions from a postal code using the free
 * Zippopotam.us service (no API key required). Used to reduce typing
 * errors on the checkout address form.
 */
export const lookupPostalCode = createServerFn({ method: 'GET' })
  .inputValidator((data) => lookupSchema.parse(data))
  .handler(async ({ data }): Promise<PostalLookupResult> => {
    const country = data.countryCode.toUpperCase();
    const code = data.postalCode.trim().replace(/\s+/g, '');

    try {
      const response = await fetch(
        `https://api.zippopotam.us/${encodeURIComponent(country)}/${encodeURIComponent(code)}`,
        { headers: { accept: 'application/json' } },
      );
      if (!response.ok) return { ok: false, places: [] };

      const payload = (await response.json()) as {
        places?: Array<{ 'place name'?: string; state?: string }>;
      };

      const places: PostalPlace[] = (payload.places ?? [])
        .map((place) => ({
          city: String(place['place name'] ?? '').trim(),
          state: String(place.state ?? '').trim(),
        }))
        .filter((place) => place.city.length > 0)
        .slice(0, 8);

      return { ok: places.length > 0, places };
    } catch {
      return { ok: false, places: [] };
    }
  });
