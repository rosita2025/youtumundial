# Plan: Optimización de Conversión para Bolso de León (Inspiración Babuno)

Clonación de estrategia de conversión del producto `lion-shaped-pet-canvas-shoulder-bag` para maximizar ventas, incluyendo textos persuasivos, pruebas sociales y sistema de incentivos por volumen.

## User Review
El usuario quiere replicar el diseño de alta conversión de un producto específico de la competencia (babuno.store). Esto incluye textos, testimonios, upsells y diseño visual, sin alterar las variantes (colores/tallas) existentes.

## Technical Details

### 1. Enriquecimiento de Datos (Prueba Social y Marketing)
- **Descripciones Persuasivas**: Refinar los `DESCRIPTION_OVERRIDES` en `src/lib/data/description.ts` para que coincidan con la estructura de beneficios de la competencia (Seguridad, Comodidad, Estilo).
- **Testimonios Reales**: Ya existen 5 reseñas en `src/lib/reviews/reviews-1688.json`. Se añadirán 3 más con fotos específicas para aumentar la densidad de prueba social.

### 2. Lógica de Conversión (Upsell e Incentivos)
- **Sistema de Descuento Automático por Volumen**: Implementar un descuento automático del 10% en el servidor (`src/lib/checkout/pricing.server.ts`) cuando el carrito contenga 2 o más unidades (o productos diferentes de la categoría "Pet").
- **Visualización de Ahorro**: Actualizar `src/components/pages/Cart.tsx` para mostrar una etiqueta de "Oferta de Pack Aplicada" cuando se cumpla la condición.

### 3. Interfaz de Usuario (Alta Conversión)
- **Incentivo Visual en Ficha**: Mostrar un banner de "Bundle & Save" (Comprar más, ahorrar más) debajo del selector de variantes.
- **Sticky Buy Bar**: Asegurar que la barra flotante muestre el ahorro potencial.
- **Sellos de Confianza**: Integrar insignias de "Garantía de Devolución de 30 días" y "Envío Seguro" más prominentes.

## Arquitectura de Archivos
- `src/lib/data/description.ts`: Actualización de textos de marketing.
- `src/lib/checkout/pricing.server.ts`: Lógica de descuento automático de upsell.
- `src/components/pages/Cart.tsx`: UI de confirmación de descuento.
- `src/components/product/UpsellSection.tsx`: Refinamiento visual para parecerse al "Bundle & Save" de la competencia.
- `src/lib/reviews/reviews-1688.json`: Inserción de nuevos testimonios.

## Verificación
- Comprobar que al añadir 2 unidades el total en el carrito refleje el 10% de descuento.
- Verificar que la descripción del bolso de león sea la versión extendida y persuasiva.
- Confirmar que las nuevas reseñas aparezcan con el distintivo de "Compra Verificada".
