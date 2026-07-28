/**
 * Validación de cupones en el servidor.
 *
 * El navegador solo manda el código escrito por el cliente: acá se resuelve
 * contra la lista pública y contra el cupón de prueba secreto (que nunca
 * viaja al bundle del navegador).
 */
import { createServerFn } from '@tanstack/react-start';
import type { Coupon } from './coupons';

export interface ValidateCouponResult {
  ok: boolean;
  message?: string;
  coupon?: Coupon;
}

export const validateCoupon = createServerFn({ method: 'POST' })
  .inputValidator((input: { code: string; subtotal: number }) => ({
    code: String(input?.code ?? '').trim().slice(0, 40),
    subtotal: Math.max(0, Number(input?.subtotal) || 0),
  }))
  .handler(async ({ data }): Promise<ValidateCouponResult> => {
    const { findCoupon } = await import('./coupons');
    const { getSecretTestCoupon } = await import('./secret-coupon.server');

    const secret = getSecretTestCoupon();
    const result = findCoupon(data.code, data.subtotal, secret ? [secret] : []);
    if (!result.ok) return { ok: false, message: result.message };
    return { ok: true, coupon: result.coupon };
  });
