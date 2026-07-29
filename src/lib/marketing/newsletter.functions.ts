/**
 * Suscripción al newsletter → Clientes de Shopify.
 *
 * El correo del formulario crea o actualiza el cliente en Shopify con
 * consentimiento de marketing (SUBSCRIBED) y la etiqueta `newsletter`,
 * para poder segmentarlos en Shopify Marketing.
 *
 * Seguridad:
 * - Validación estricta del correo en el servidor (formato y longitud).
 * - Nunca se devuelven detalles internos ni errores de Shopify al navegador.
 * - Respuesta genérica para no permitir enumerar clientes existentes.
 */
import { createServerFn } from '@tanstack/react-start';

export interface NewsletterResult {
  ok: boolean;
  message: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

export const subscribeNewsletter = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const raw = (data as { email?: unknown } | undefined)?.email;
    const email = String(raw ?? '').trim().toLowerCase().slice(0, 254);
    if (!EMAIL_RE.test(email)) throw new Error('INVALID_EMAIL');
    return { email };
  })
  .handler(async ({ data }): Promise<NewsletterResult> => {
    try {
      const { upsertShopifyCustomer } = await import('@/lib/shopify/customers.server');
      const result = await upsertShopifyCustomer({
        email: data.email,
        acceptsMarketing: true,
        extraTags: ['newsletter', 'newsletter-youtumundial'],
      });

      if (!result.ok) {
        return { ok: false, message: 'No pudimos registrar tu correo. Inténtalo más tarde.' };
      }
      return { ok: true, message: '¡Gracias por suscribirte! Revisa tu correo.' };
    } catch {
      return { ok: false, message: 'No pudimos registrar tu correo. Inténtalo más tarde.' };
    }
  });
