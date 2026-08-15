# Cupón de prueba de $1 con envío gratis

Objetivo: poder hacer una compra real de prueba en Stripe por exactamente **1,00 USD**, con envío en $0, sin dejar un cupón peligroso abierto al público.

Hoy los cupones solo aplican % o monto fijo, y un total menor a $0.50 se bloquea salvo con el cupón secreto del servidor (100% de descuento). Eso no permite fijar un total de $1.

## Qué se va a hacer

1. Nuevo tipo de cupón "total fijo": el cupón puede fijar el total del pedido en un importe exacto (1,00 USD) y poner el envío en $0.
2. Alta del cupón de prueba **PRUEBA1DOLAR**: total fijo $1.00, envío gratis, activo.
3. El total fijo se calcula en el servidor (no se puede manipular desde el navegador) y se refleja igual en el resumen del carrito y del checkout: Subtotal, Descuento, Envío $0.00, Total $1.00.
4. Stripe recibe una sola línea de $1.00 con el detalle del pedido, para que el cobro real sea de un dólar.
5. El pedido de prueba queda etiquetado como prueba en la sincronización de pedidos, para distinguirlo de una venta real.
6. Aviso en el plan de seguridad: el cupón queda activo solo para la prueba; después conviene desactivarlo (cambiando `active: false`) para que nadie más compre mercadería física por $1.

## Detalles técnicos

- `src/lib/checkout/coupons.ts`: nuevo campo opcional `fixedTotal?: number` en `Coupon` + entrada `PRUEBA1DOLAR` (`fixedTotal: 1`, `freeShipping: true`).
- `src/lib/checkout/pricing.server.ts`: si el cupón trae `fixedTotal`, el total pasa a ser ese valor, el envío se fuerza a 0, `discount = subtotal - fixedTotal`, y se salta el bloqueo de `total < 0.5` (ya no aplica porque el total es $1). Las líneas para Stripe se reemplazan por una única línea de 100 centavos con descripción "Pedido de prueba".
- `src/lib/checkout/order.ts` y `src/components/pages/Checkout.tsx` / `Cart.tsx`: respetar `fixedTotal` en los totales mostrados, sin tocar el diseño actual.
- Sin cambios en textos ni en el layout del checkout.

## Validación

- Aplicar `PRUEBA1DOLAR` en el carrito y verificar Envío $0.00 y Total $1.00.
- Ir al checkout y confirmar que Stripe abre con 1,00 USD.
