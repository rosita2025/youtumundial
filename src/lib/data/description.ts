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
  "lion-shaped-pet-canvas-shoulder-bag": `¡Lleva a tu mascota con estilo y comodidad absoluta!

Nuestro Bolso de Lona con Forma de León es la combinación perfecta de diseño divertido y funcionalidad premium. Inspirado en la estética minimalista y juguetona, este transportador permite que tu gato o perro pequeño te acompañe a todas partes mientras luce adorable.

Beneficios Destacados:
• Diseño Ergonómico: Correa ancha y ajustable que distribuye el peso equitativamente sobre tu hombro, evitando fatiga.
• Máxima Ventilación: Fabricado con lona de algodón 100% transpirable, manteniendo a tu mascota fresca en todo momento.
• Seguridad Garantizada: Incluye un cierre de seguridad interno para enganchar al collar y evitar saltos accidentales.
• Interacción Constante: El diseño con apertura frontal permite que tu mascota asome la cabeza para disfrutar del paisaje contigo.

Especificaciones:
- Material: Lona de alta densidad lavable.
- Capacidad: Ideal para mascotas de hasta 5kg.
- Uso: Perfecto para paseos diarios, visitas al veterinario o viajes cortos.

Dale a tu mejor amigo el confort que se merece con el bolso más viral de la temporada.`
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
