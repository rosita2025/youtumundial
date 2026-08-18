# Plan - Vista Previa de Imágenes en Testimonios

Implementar un visor de imágenes (modal/lightbox) para las fotos de los testimonios, evitando que el usuario sea redirigido a otra página al hacer clic en ellas.

## Cambios

### UI y Componentes

- **src/components/product/ProductReviews.tsx**
    - Importar el componente `Dialog` de shadcn/ui.
    - Reemplazar el enlace `<a>` que abre la imagen en una pestaña nueva por un disparador de `Dialog` (`DialogTrigger`).
    - Añadir el contenido del modal (`DialogContent`) para mostrar la imagen a tamaño completo con el sello de agua `@youtumundial`.

## Detalles Técnicos

- Usar `Dialog` de `@/components/ui/dialog` para la accesibilidad y el manejo del estado del modal.
- Asegurar que la imagen dentro del modal mantenga la relación de aspecto y sea responsiva.
- Mantener el diseño actual de las miniaturas pero cambiar el comportamiento del clic.

## Verificación

- Abrir una página de producto con reseñas (ej. el bolso de león).
- Hacer clic en una foto de reseña.
- Confirmar que se abre un modal con la imagen y no una pestaña nueva del navegador.
- Verificar que el modal se pueda cerrar correctamente.