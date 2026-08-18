/**
 * Limpieza de descripciones importadas.
 *
 * Los productos que llegan desde SUP/1688 traen la descripción con HTML crudo,
 * etiquetas <img> de alicdn, estilos inline y texto en chino. Cuando eso se
 * muestra tal cual, la ficha del producto se ve rota y no refleja la
 * descripción real que se editó en Shopify.
 *
 * Esta función deja solo texto legible: quita etiquetas, escapes, imágenes,
 * caracteres CJK sueltos y espacios repetidos. Es defensiva: nunca inyectamos
 * HTML del proveedor en el DOM.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

const DESCRIPTION_OVERRIDES: Record<string, string> = {
  "lion-shaped-pet-canvas-shoulder-bag": `Happy kitten owners share their stories: See how neighbors turn daily outdoor strolls into cozy bonding time with their little companions.

¡Lleva a tu mascota con estilo y comodidad absoluta! Inspirado en babuno, este bolso de lona con forma de león es el accesorio viral que tu mascota estaba esperando.

Beneficios Premium:
• 96% Seguridad Total: Se sienten completamente seguros mientras llevan a su mascota en aventuras al aire libre gracias al gancho de seguridad integrado.
• 95% Libertad de Exploración: Gana la libertad de explorar senderos del vecindario sin preocuparte por una mascota inquieta.
• 98% Confianza en el Diseño: Confianza total al elegir este diseño divertido para cada paseo.

Características Técnicas:
- Soft Canvas: El algodón suave crea un lugar acogedor y fresco (Máxima Ventilación).
- Effortless Comfort: Correa ancha diseñada para que el peso sea imperceptible.
- Secure Fit: Mantiene a tu pequeña mascota segura y cerca de ti en todo momento.

UPDATE: Debido a nuestra reciente venta masiva, el stock es muy limitado. Asegura el tuyo mientras duren las existencias. ¡Solo quedan pocas unidades en stock!`
};

export function cleanDescription(raw: string | null | undefined, slug?: string, maxLength = 1200): string {
  if (slug && DESCRIPTION_OVERRIDES[slug]) {
    return DESCRIPTION_OVERRIDES[slug];
  }

  let text = String(raw ?? '');
  if (!text) return '';

  // Escapes de JSON dobles que llegan desde el importador ("\\n", "\\\"").
  text = text.replace(/\\+n/g, '\n').replace(/\\+"/g, '"').replace(/\\+/g, ' ');

  // Bloques que nunca deben mostrarse.
  text = text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' ');

  // Cualquier otra etiqueta HTML.
  text = text.replace(/<\/?[a-z][^>]*>/gi, ' ');

  // Entidades y URLs sueltas de CDN del proveedor.
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    text = text.split(entity).join(char);
  }
  text = text.replace(/https?:\/\/\S*(alicdn|1688|taobao)\S*/gi, ' ');

  // Texto en chino/japonés que el proveedor deja mezclado.
  text = text.replace(/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]+/g, ' ');

  // Restos de CSS inline tipo "width: 790.0px;".
  text = text.replace(/[a-z-]+\s*:\s*[^;{}]+;/gi, ' ');

  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length > maxLength) {
    text = `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}…`;
  }
  return text;
}
