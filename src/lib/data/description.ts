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

### SECTION 1: HERO SECTION
# Cozy Roaring Cub Pouch
Experience safe and fun walks like never before. Keep your little companion close to your heart in total comfort, wrapped in breathable, premium materials.
Get yours today for just $43.99 USD and start exploring together.
CTA: GET YOURS TODAY

### SECTION 2: SOCIAL PROOF & KEY BENEFITS
## Join 1,000+ Happy Pet Parents
- **Total Security**: Feel 100% confident taking your small pet on outdoor adventures. Our built-in safety hook and adjustable neck opening ensure your cub stays snug and secure.
- **Stress-Free Freedom**: Explore the world together while keeping your hands free. Whether you're at the park or the mall, your pet enjoys the view safely by your side.
- **Cute & Playful Design**: Turn heads and inspire smiles with our viral "Lion Cub" design. It's more than a carrier—it's a fun fashion statement that celebrates your bond.

### SECTION 3: OFFER, CHECKOUT & GUARANTEE
## Start Your Journey Together
Price: $43.99 USD
• FREE Shipping Worldwide
• Secure Checkout (SSL Encrypted)
• Fast Delivery (10-15 Days)

**30-Day Money-Back Guarantee**
Your satisfaction is our priority. If you and your pet aren't 100% happy, we offer a full refund, no hassle, no questions asked.`,
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
