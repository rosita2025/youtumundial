import { createServerFn } from '@tanstack/react-start';

export interface DirectOrderInput {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  countryCode: string;
  address: string;
  couponCode?: string;
  items: { variantId: string; quantity: number }[];
}

export interface DirectOrderResult {
  ok: boolean;
  supOrderId?: string;
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
    items: Array.isArray(input?.items) ? input.items : [],
  }))
  .handler(async ({ data }): Promise<DirectOrderResult> => {
    const { priceOrder, normalizeCartLines } = await import('@/lib/checkout/pricing.server');
    const { shippingCountries } = await import('@/lib/checkout/config');
    const { isFreeOrderAllowed } = await import('@/lib/checkout/secret-coupon.server');

    // Este endpoint despacha sin cobrar: solo el cupón de prueba secreto lo abre.
    if (!isFreeOrderAllowed(data.couponCode)) {
      return { ok: false, message: 'Este pedido requiere pago. Elegí un método de pago.' };
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
      return { ok: false, message: 'Este pedido requiere pago. Elegí un método de pago.' };
    }

    const supItems = priced.lines.filter((line) => line.supProductId);
    if (!supItems.length) {
      return { ok: false, message: 'El pedido no tiene productos de SUP.' };
    }

    const country = shippingCountries.find((c) => c.code === data.countryCode);
    const { createPurchaseOrder } = await import('./sup-api.server');

    try {
      const result = (await createPurchaseOrder({
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
      })) as Record<string, unknown>;

      const body = (result.data ?? result) as Record<string, unknown>;
      const supOrderId = String(body.order_id ?? body.id ?? body.order_sn ?? body.order_no ?? '');
      if (!supOrderId) {
        // SUP aceptó el pedido pero no devolvió número: no perdemos la compra.
        console.warn('createDirectSupOrder: SUP sin order_id', data.reference);
        return {
          ok: true,
          pending: true,
          message: 'Pedido registrado. Lo confirmamos con el proveedor en breve.',
        };
      }
      return { ok: true, supOrderId };
    } catch (error) {
      // El detalle queda solo en los logs del servidor (puede traer credenciales
      // o respuestas crudas del proveedor).
      console.error('createDirectSupOrder', data.reference, (error as Error).message);
      // No cancelamos la compra del cliente por una caída del proveedor:
      // el pedido queda pendiente de envío manual a SUP.
      return {
        ok: true,
        pending: true,
        message: 'Pedido registrado. Lo confirmamos con el proveedor en breve.',
      };
    }

  });
