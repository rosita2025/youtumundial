# Plan: Estimación de Costo y Tiempo de Envío en el Carrito

Agregar una sección en la página del carrito (`/cart`) que permita a los usuarios ingresar su código postal y seleccionar su país para obtener una estimación en tiempo real del costo de envío y el tiempo de entrega (ETA) antes de proceder al checkout.

## User Review Required

> [!IMPORTANT]
> - ¿Prefieres que la estimación sea automática al detectar la ubicación (IP) o siempre manual mediante el formulario? (Por defecto será manual para mayor precisión con el código postal).
> - La estimación de impuestos se mantendrá como un cálculo fijo (8%) o se puede ocultar hasta el checkout si prefieres.

## Proposed Changes

### Logic & Helpers
- Utilizar las utilidades existentes en `src/lib/checkout/config.ts` y `src/lib/checkout/countries.ts` para obtener tarifas y ETAs.

### UI Components
- Crear un nuevo componente `ShippingEstimator` dentro de `src/components/pages/Cart.tsx` (o un archivo separado si es muy extenso).
- El componente incluirá:
    - Selector de país (con búsqueda o lista desplegable).
    - Campo de entrada para código postal (opcional pero recomendado para el usuario).
    - Botón "Calcular".
    - Visualización del costo y tiempo estimado.

### Integration
- **Actualizar `src/components/pages/Cart.tsx`**:
    - Insertar el `ShippingEstimator` en la barra lateral del resumen del pedido (Order Summary), justo antes del botón "Ir al checkout".
    - Sincronizar el estado del envío calculado con el total del carrito mostrado en el resumen.
    - Asegurar que la lógica de "Envío Gratis" (umbral de $45) siga funcionando correctamente.

## Technical Details
- **Estado**: Usar `useState` local para el país y código postal seleccionados.
- **Validación**: Verificar que el código postal tenga un formato básico según el país seleccionado (usando las regex que ya existen en `src/lib/checkout/customer.ts` si es posible).
- **Consistencia**: Asegurar que las tarifas mostradas coincidan exactamente con las del checkout final.

```typescript
// Ejemplo de lógica a insertar
const estimatedRate = shippingCountryFor(selectedCountry).shipping;
const estimatedEta = shippingCountryFor(selectedCountry).eta;
```
