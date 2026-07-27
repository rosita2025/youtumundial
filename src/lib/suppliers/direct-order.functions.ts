import { createServerFn } from '@tanstack/react-start';

export interface DirectOrderItem {
  supProductId?: string;
  supVariantId?: string;
  supVariantSku?: string;
  variantTitle?: string;
  quantity: number;
}

export interface DirectOrderInput {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  country: string;
  address: string;
  note?: string;
  items: DirectOrderItem[];
}

export interface DirectOrderResult {
  ok: boolean;
  supOrderId?: string;
  message?: string;
}

/**
 * Crea el pedido en SUP Dropshipping para compras que no pasan por Stripe
 * (cupón del 100%, Yape/Plin, PayPal manual). Así aparecen en /admin/pedidos.
 */
export const createDirectSupOrder = createServerFn({ method: 'POST' })
  .inputValidator((input: DirectOrderInput) => {
    const items = (input?.items ?? [])
      .filter((i) => i && i.supProductId)
      .map((i) => ({
        supProductId: String(i.supProductId),
        supVariantId: i.supVariantId ? String(i.supVariantId) : undefined,
        supVariantSku: i.supVariantSku ? String(i.supVariantSku) : undefined,
        variantTitle: String(i.variantTitle ?? ''),
        quantity: Math.max(1, Number(i.quantity) || 1),
      }));
    return {
      reference: String(input?.reference ?? '').slice(0, 60) || `YTM-${Date.now()}`,
      name: String(input?.name ?? '').slice(0, 120),
      email: String(input?.email ?? '').slice(0, 160),
      phone: String(input?.phone ?? '').slice(0, 40),
      country: String(input?.country ?? '').slice(0, 60),
      address: String(input?.address ?? '').slice(0, 300),
      note: String(input?.note ?? '').slice(0, 200),
      items,
    };
  })
  .handler(async ({ data }): Promise<DirectOrderResult> => {
    if (!data.items.length) {
      return { ok: false, message: 'El pedido no tiene productos de SUP.' };
    }

    const { createPurchaseOrder } = await import('./sup-api.server');

    try {
      const result = (await createPurchaseOrder({
        remark: `Youtumundial · ${data.note || data.reference}`,
        out_trade_no: data.reference,
        consignee: {
          name: data.name || 'Cliente Youtumundial',
          phone: data.phone,
          email: data.email,
          country: data.country,
          address: data.address,
        },
        products: data.items.map((item) => ({
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
        return { ok: false, message: 'SUP no devolvió un número de pedido.' };
      }
      return { ok: true, supOrderId };
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }
  });
