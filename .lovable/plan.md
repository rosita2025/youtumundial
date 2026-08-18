# Plan de Clonación de Producto y Mejora de Conversión

Este plan detalla los pasos para clonar el contenido de un producto externo (incluyendo reseñas, descripción y elementos de venta) y mejorar la conversión mediante la implementación de un sistema de upsells.

## Cambios sugeridos

### Clonación de Contenido
1. **Contenido del Producto:** Extraer y adaptar el texto de la descripción, beneficios y detalles del producto indicado. Se integrará en la ficha del producto actual sin alterar las variantes (colores y tallas) ya sincronizadas con Shopify.
2. **Reseñas y Testimonios:** Implementar un pool de reseñas específicas para este producto basado en testimonios reales del origen, utilizando el sistema de `reviewOverrides` o `reviews-1688.json` para asegurar que se muestren en la tienda.
3. **Optimización de Conversión:** Asegurar que los elementos visuales del producto sigan la estética minimalista de Apple solicitada, manteniendo la limpieza de descripciones para evitar HTML basura.

### Sistema de Upsells
1. **Ofertas Complementarias:** Crear una sección de "Upsell" o "Ofertas de Pack" que sugiera productos relacionados con descuento (ej. "Lleva 2 con 10% de descuento" o "Agrega este accesorio y ahorra").
2. **Implementación Técnica:**
   - Crear un componente `UpsellSection.tsx` para la página de producto.
   - Definir la lógica de descuentos en el servidor (`pricing.server.ts`) para que se apliquen automáticamente al carrito si se detecta la oferta.
   - Mostrar insignias de ahorro en el checkout para incentivar la compra mayor.

## Detalles técnicos
- **Ruta del Producto:** Los cambios afectarán a `src/components/pages/ProductDetail.tsx`.
- **Lógica de Datos:** Se actualizará `src/lib/data/data-provider.ts` para manejar la selección de productos de upsell.
- **Reseñas:** Se añadirá la entrada correspondiente en `src/lib/reviews/reviews-1688.json` (o similar) para el slug del producto.
- **Seguridad:** Los descuentos de upsell se validarán en el servidor antes de enviarlos a Stripe/Shopify.

## Pregunta de aclaración
¿Tienes una lista específica de productos que deberían aparecer como upsells para este bolso (por ejemplo, otros accesorios para mascotas), o prefieres que los seleccione automáticamente basándome en la categoría del producto?
