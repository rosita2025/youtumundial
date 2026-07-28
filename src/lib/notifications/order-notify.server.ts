/**
 * Emails del pedido (solo servidor).
 *
 * - Confirmación de compra: se manda apenas Stripe confirma el pago.
 * - Aviso de demora: se manda si el proveedor (SUP) no aceptó el pedido en el
 *   momento, para que el cliente sepa que su compra está registrada.
 *
 * Usa la misma API de email que el aviso de envío (`RESEND_API_KEY`). Si no hay
 * servicio configurado no se rompe nada: devuelve `sent: false` con el motivo.
 */

import type { NotifyResult } from './shipping-notify.server';

const STORE_NAME = 'Youtumundial';
const STORE_URL = 'https://youtumundial.com';

export interface OrderEmailInput {
  email?: string;
  customer?: string;
  reference: string;
  total?: number;
  currency?: string;
  lines?: { title: string; quantity: number }[];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function send(to: string, subject: string, text: string, html: string): Promise<NotifyResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SHIPPING_EMAIL_FROM ?? 'Youtumundial <pedidos@youtumundial.com>';
  if (!apiKey) {
    return { sent: false, message: 'Sin servicio de email configurado.' };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      return { sent: false, message: `Email rechazado (${response.status}): ${detail}` };
    }
    return { sent: true, message: 'Email enviado.' };
  } catch (error) {
    return { sent: false, message: `No se pudo enviar el email: ${(error as Error).message}` };
  }
}

function itemsBlock(input: OrderEmailInput) {
  const lines = input.lines ?? [];
  const text = lines.map((l) => `· ${l.title} x${l.quantity}`).join('\n');
  const html = lines
    .map((l) => `<li>${escapeHtml(l.title)} × ${l.quantity}</li>`)
    .join('');
  return { text, html };
}

function totalLabel(input: OrderEmailInput) {
  if (typeof input.total !== 'number') return '';
  return `${input.currency ?? 'USD'} ${input.total.toFixed(2)}`;
}

/** Confirmación de compra: pago recibido y pedido en preparación. */
export async function notifyOrderConfirmed(input: OrderEmailInput): Promise<NotifyResult> {
  if (!input.email) return { sent: false, message: 'El pedido no tiene email del cliente.' };
  const items = itemsBlock(input);
  const total = totalLabel(input);
  const trackUrl = `${STORE_URL}/seguimiento?ref=${encodeURIComponent(input.reference)}`;

  const text =
    `Hola ${input.customer ?? ''}!\n\n` +
    `Recibimos tu pago y tu pedido de ${STORE_NAME} ya está en preparación.\n\n` +
    `Pedido: ${input.reference}\n` +
    (items.text ? `${items.text}\n` : '') +
    (total ? `Total: ${total}\n` : '') +
    `\nSeguí tu pedido acá: ${trackUrl}\n` +
    `Te avisamos por email apenas tengamos el número de seguimiento.\n\n` +
    `Gracias por comprar en ${STORE_URL}`;

  const html =
    `<div style="font-family:Arial,sans-serif;color:#1f2419">` +
    `<h2>¡Gracias por tu compra!</h2>` +
    `<p>Hola ${escapeHtml(input.customer ?? '')}, recibimos tu pago y tu pedido ya está en preparación.</p>` +
    `<p><strong>Pedido:</strong> ${escapeHtml(input.reference)}</p>` +
    (items.html ? `<ul>${items.html}</ul>` : '') +
    (total ? `<p><strong>Total:</strong> ${escapeHtml(total)}</p>` : '') +
    `<p><a href="${trackUrl}">Seguir mi pedido</a></p>` +
    `<p style="color:#6b7280;font-size:13px">Te avisamos por email apenas tengamos el número de seguimiento.</p>` +
    `<p><a href="${STORE_URL}">${STORE_URL}</a></p>` +
    `</div>`;

  return send(input.email, `Confirmamos tu pedido ${input.reference}`, text, html);
}

/** Aviso de demora: el pago entró pero el proveedor todavía no confirmó el envío. */
export async function notifyOrderDelayed(input: OrderEmailInput): Promise<NotifyResult> {
  if (!input.email) return { sent: false, message: 'El pedido no tiene email del cliente.' };
  const trackUrl = `${STORE_URL}/seguimiento?ref=${encodeURIComponent(input.reference)}`;

  const text =
    `Hola ${input.customer ?? ''}!\n\n` +
    `Tu pago fue recibido y tu pedido ${input.reference} quedó registrado en ${STORE_NAME}.\n` +
    `Estamos terminando de confirmarlo con nuestro proveedor, así que puede demorar unas horas más de lo normal.\n\n` +
    `No tenés que hacer nada: te escribimos apenas salga el envío.\n` +
    `Seguimiento: ${trackUrl}\n\n` +
    `Si preferís cancelar y que te devolvamos el dinero, respondé este email.\n` +
    `${STORE_URL}`;

  const html =
    `<div style="font-family:Arial,sans-serif;color:#1f2419">` +
    `<h2>Tu pedido está registrado</h2>` +
    `<p>Hola ${escapeHtml(input.customer ?? '')}, recibimos tu pago y tu pedido <strong>${escapeHtml(input.reference)}</strong> quedó registrado.</p>` +
    `<p>Estamos terminando de confirmarlo con nuestro proveedor, así que puede demorar unas horas más de lo normal. No tenés que hacer nada: te escribimos apenas salga el envío.</p>` +
    `<p><a href="${trackUrl}">Ver el estado de mi pedido</a></p>` +
    `<p style="color:#6b7280;font-size:13px">Si preferís cancelar y que te devolvamos el dinero, respondé este email.</p>` +
    `<p><a href="${STORE_URL}">${STORE_URL}</a></p>` +
    `</div>`;

  return send(input.email, `Tu pedido ${input.reference} está en proceso`, text, html);
}
