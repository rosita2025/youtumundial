import { createServerFn } from '@tanstack/react-start';

export interface ManualOrderInput {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  countryCode: string;
  address: string;
  couponCode?: string;
  items: { variantId: string; quantity: number }[];
}

export interface ManualOrderResult {
  ok: boolean;
  reference?: string;
  /** Número visible del pedido en Shopify (ej. #1007). */
  shopifyOrderNumber?: string;
  /** Total real calculado en el servidor (USD). */
  total?: number;
  totalPen?: number;
  message?: string;
}

/**
 * Pedido con pago manual (Yape / Plin desde Perú).
 *
 * El precio SIEMPRE se recalcula acá con el catálogo real: el navegador nunca
 * decide el importe. El pedido se registra en Shopify como PENDIENTE DE PAGO
 * (no PAID) y NO se envía a SUP hasta confirmar la transferencia, así nadie
 * puede obtener mercadería sin pagar. Los pedidos de $0 se rechazan.
 */
export const createManualOrder = createServerFn({ method: 'POST' })
  .inputValidator((input: ManualOrderInput) => ({
    reference: String(input?.reference ?? '').slice(0, 60) || `YTM-${Date.now()}`,
    name: String(input?.name ?? '').slice(0, 120),
    email: String(input?.email ?? '').slice(0, 160),
    phone: String(input?.phone ?? '').slice(0, 40),
    countryCode: String(input?.countryCode ?? '').slice(0, 5),
    address: String(input?.address ?? '').slice(0, 300),
    couponCode: String(input?.couponCode ?? '').slice(0, 40),
    items: Array.isArray(input?.items) ? input.items : [],
  }))
  .handler(async ({ data }): Promise<ManualOrderResult> => {
    const { priceOrder, normalizeCartLines } = await import('./pricing.server');
    const { checkoutConfig } = await import('./config');

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

    // El pago manual es para pedidos con importe real. Un total en cero solo
    // se permite por el circuito del cupón secreto de prueba, nunca acá.
    if (priced.total < 0.5) {
      return {
        ok: false,
        message: 'Este pedido no tiene importe a pagar. Quitá el cupón para probar el pago manual.',
      };
    }

    const totalPen = Math.round(priced.total * checkoutConfig.usdToPen * 100) / 100;

    // Repartimos el envío en las líneas no: se agrega el envío al note para no
    // alterar precios unitarios reales del catálogo.
    const { createShopifyOrderIdempotent } = await import('@/lib/shopify/admin.server');
    const shopify = await createShopifyOrderIdempotent({
      reference: data.reference,
      email: data.email,
      name: data.name,
      phone: data.phone,
      currency: 'USD',
      address: { line1: data.address, country: data.countryCode },
      extraTags: ['pago-manual', 'yape'],
      financialStatus: 'PENDING',
      note:
        `Pago manual Yape/Plin · ${data.reference} · ` +
        `Total $${priced.total.toFixed(2)} USD (S/ ${totalPen.toFixed(2)}) · ` +
        `Envío $${priced.shipping.toFixed(2)}` +
        (priced.coupon ? ` · Cupón ${priced.coupon.code}` : '') +
        ' · Pendiente de confirmar la captura del pago.',
      lines: priced.lines.map((line) => ({
        title: line.variantTitle
          ? `${line.name}`
          : line.name || 'Producto Youtumundial',
        quantity: line.quantity,
        price: line.amountInCents / 100,
        sku: line.supVariantSku,
        variantId: line.shopifyVariantId,
      })),

    });

    if (!shopify.ok) {
      return { ok: false, message: shopify.message ?? 'No se pudo registrar el pedido en la tienda.' };
    }

    return {
      ok: true,
      reference: data.reference,
      shopifyOrderNumber: shopify.orderName,
      total: priced.total,
      totalPen,
    };
  });
