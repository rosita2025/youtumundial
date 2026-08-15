import { createServerFn } from '@tanstack/react-start';

export interface DirectOrderInput {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  countryCode: string;
  address: string;
  couponCode?: string;
  /** Referencia del carrito abandonado a cerrar cuando el pedido se registra. */
  abandonedReference?: string;
  items: { variantId: string; quantity: number }[];
}

export interface DirectOrderResult {
  ok: boolean;
  supOrderId?: string;
  /** Número visible del pedido en Shopify (ej. #1001). */
  shopifyOrderNumber?: string;
  /** El pedido quedó registrado en la tienda pero todavía no en SUP. */
  pending?: boolean;
  message?: string;
}


/**
 * Crea el pedido en SUP Dropshipping para compras sin cargo (cupón del 100%).
 * El servidor recalcula el total con el catálogo y el cupón reales: si el
 * pedido no da $0 se rechaza, así nadie puede pedir mercadería gratis.
 */
export const createDirectSupOrder = createServerFn({ method: 'POST' })
  .inputValidator((input: DirectOrderInput) => ({
    reference: String(input?.reference ?? '').slice(0, 60) || `YTM-${Date.now()}`,
    name: String(input?.name ?? '').slice(0, 120),
    email: String(input?.email ?? '').slice(0, 160),
    phone: String(input?.phone ?? '').slice(0, 40),
    countryCode: String(input?.countryCode ?? '').slice(0, 5),
    address: String(input?.address ?? '').slice(0, 300),
    couponCode: String(input?.couponCode ?? '').slice(0, 40),
    abandonedReference: String(input?.abandonedReference ?? '').slice(0, 60),
    items: Array.isArray(input?.items) ? input.items : [],
  }))
  .handler(async ({ data }): Promise<DirectOrderResult> => {

    // Segunda barrera: los datos de envío se revalidan en el servidor.
    const { validateShippingSnapshot } = await import('@/lib/checkout/customer');
    const shippingCheck = validateShippingSnapshot(data);
    if (!shippingCheck.ok) {
      return { ok: false, message: shippingCheck.message };
    }
    const { priceOrder, normalizeCartLines } = await import('@/lib/checkout/pricing.server');
    const { shippingCountryFor } = await import('@/lib/checkout/config');
    const { isFreeOrderAllowed } = await import('@/lib/checkout/secret-coupon.server');

    // Este endpoint despacha sin cobrar: solo el cupón de prueba secreto lo abre.
    if (!isFreeOrderAllowed(data.couponCode)) {
      return { ok: false, message: 'This order requires payment. Please choose a payment method.' };
    }

    let priced;
    try {
      priced = await priceOrder({
        items: normalizeCartLines(data.items),
        countryCode: data.countryCode,
        couponCode: data.couponCode || undefined,
      });
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }

    // Solo se despacha sin pago si el total real, calculado acá, es cero.
    if (priced.total >= 0.5) {
      return { ok: false, message: 'This order requires payment. Please choose a payment method.' };
    }

    const supItems = priced.lines.filter((line) => line.supProductId);
    if (!supItems.length) {
      return { ok: false, message: 'Order does not contain supplier products.' };
    }

    const country = shippingCountryFor(data.countryCode);
    const { createPurchaseOrderIdempotent } = await import('./sup-api.server');

    // Los pedidos con cupón también se registran en Shopify (total 0) para que
    // la tienda tenga el pedido, el cliente y el número visible (#1001).
    // Con reintentos automáticos y sin duplicar (se busca por referencia).
    const { createShopifyOrderIdempotent } = await import('@/lib/shopify/admin.server');
    const shopifyResult = await createShopifyOrderIdempotent({
      reference: data.reference,
      email: data.email,
      name: data.name,
      phone: data.phone,
      currency: 'USD',
      address: { line1: data.address, country: data.countryCode },
      note: `Pedido con cupón ${data.couponCode || 'promocional'} · ${data.reference}`,
      lines: priced.lines.map((line) => ({
        title: line.variantTitle || 'Producto Youtumundial',
        quantity: line.quantity,
        price: 0,
        sku: line.supVariantSku,
      })),
    });
    const shopifyOrderNumber = shopifyResult.ok ? shopifyResult.orderName : undefined;

    // El carrito dejó de estar abandonado: cerramos el borrador en Shopify.
    if (data.abandonedReference) {
      try {
        const { closeAbandonedCheckout } = await import('@/lib/shopify/abandoned.server');
        await closeAbandonedCheckout(data.abandonedReference);
      } catch (error) {
        console.warn('createDirectSupOrder(abandoned)', (error as Error).message);
      }
    }

    const created = await createPurchaseOrderIdempotent(data.reference, {
      remark: `Youtumundial · ${data.reference}`,
      out_trade_no: data.reference,
      consignee: {
        name: data.name || 'Cliente Youtumundial',
        phone: data.phone,
        email: data.email,
        country: country?.name ?? data.countryCode,
        address: data.address,
      },
      products: supItems.map((item) => ({
        product_id: item.supProductId,
        variant_id: item.supVariantId,
        product_sn: item.supVariantSku,
        quantity: item.quantity,
        variant: item.variantTitle,
      })),
    });

    if (!created.ok || !created.supOrderId) {
      // No cancelamos la compra del cliente por una caída del proveedor:
      // el pedido queda pendiente y se puede re-sincronizar.
      return {
        ok: true,
        pending: true,
        shopifyOrderNumber,
        message: 'Order registered. We will confirm with the supplier shortly.',
      };
    }

    return { ok: true, supOrderId: created.supOrderId, shopifyOrderNumber };
  });

/**
 * Re-sincronización manual de un pedido con cupón: vuelve a intentar Shopify y
 * SUP usando la misma referencia, así nunca se duplica el pedido.
 */
export const resyncDirectOrder = createServerFn({ method: 'POST' })
  .inputValidator((input: { reference: string }) => ({
    reference: String(input?.reference ?? '').trim().slice(0, 60),
  }))
  .handler(async ({ data }): Promise<DirectOrderResult> => {
    if (!data.reference) return { ok: false, message: 'Missing order reference.' };

    const { findShopifyOrderByReference } = await import('@/lib/shopify/admin.server');
    const { findSupOrderByReference } = await import('./sup-api.server');

    const shopify = await findShopifyOrderByReference(data.reference);
    const supOrderId = await findSupOrderByReference(data.reference);

    return {
      ok: true,
      supOrderId: supOrderId || undefined,
      shopifyOrderNumber: shopify?.orderName,
      pending: !supOrderId,
      message: supOrderId
        ? 'Order synchronized with the supplier.'
        : 'Not yet visible at the supplier. We continue to retry.',
    };
  });

