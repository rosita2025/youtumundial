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

export function cleanDescription(raw: string | null | undefined, maxLength = 1200): string {
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
