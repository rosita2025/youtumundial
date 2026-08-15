# Plan para Mejorar la Barra de Compra Adhesiva (Sticky Buy Bar)

El objetivo es actualizar la `StickyAddToCart` para incluir reseñas (estrellas y número), el título del producto y marcadores de confianza (envío rápido, devoluciones y calidad premium), mejorando la conversión en dispositivos móviles y escritorio.

## Cambios sugeridos

### Componente `StickyAddToCart`
- **Integrar reseñas**: Añadir `useReviewSummary` para obtener la calificación promedio y el total de reseñas del producto.
- **Visualización de estrellas**: Utilizar el componente `StarRating` dentro de la barra.
- **Marcadores de confianza**: Añadir una fila inferior o lateral con iconos y texto breve:
    - "Fast Shipping" (Envío rápido)
    - "Easy Returns" (Devoluciones)
    - "Premium Quality" (Calidad premium)
- **Refinar diseño**: Ajustar el espaciado para que el título, las estrellas y los marcadores de confianza coexistan sin saturar la interfaz, especialmente en móviles.

### Estilos
- Asegurar que el texto de los marcadores sea pequeño (`text-[10px]` o `text-xs`) para mantener la elegancia de la barra.
- Mantener los logotipos de métodos de pago ya existentes.

## Detalles técnicos
- **Archivo**: `src/components/product/StickyAddToCart.tsx`
- **Nuevas dependencias**: `useReviewSummary` de `@/lib/reviews/use-reviews` y `StarRating` de `@/components/product/StarRating`.
- **Iconos**: Usar `Truck`, `RotateCcw` y `Gem` de `lucide-react`.

## Pasos a seguir
1. Importar los hooks y componentes de reseñas necesarios.
2. Actualizar la interfaz de props si es necesario (aunque el `product` ya contiene el `slug`).
3. Modificar el JSX para incluir el bloque de estrellas debajo del título.
4. Insertar la nueva sección de "Fast Shipping", "Returns" y "Premium" en el diseño flex.
5. Validar la respuesta visual en el modo móvil del navegador.
