/**
 * Aviso al cliente cuando SUP Dropshipping despacha su pedido.
 *
 * Si hay una API de email configurada (`RESEND_API_KEY`) se envía solo.
 * Si no la hay, devolvemos `queued: false` con el motivo y el panel
 * `/admin/pedidos` muestra un botón para avisar a mano (email o WhatsApp).
 */

export interface ShippedNotification {
  email: string;
  customer: string;
  tracking: string;
  carrier?: string;
  trackingUrl?: string;
  supOrderId: string;
}

export interface NotifyResult {
  sent: boolean;
  message: string;
}

const STORE_NAME = 'Youtumundial';
const STORE_URL = 'https://youtumundial.com';

export function buildShippedText(n: ShippedNotification) {
  const carrier = n.carrier ? ` con ${n.carrier}` : '';
  const url = n.trackingUrl ? `\nSeguimiento: ${n.trackingUrl}` : '';
  return (
    `Hola ${n.customer || ''}!\n\n` +
    `Tu pedido de ${STORE_NAME} ya fue despachado${carrier}.\n` +
    `Número de seguimiento: ${n.tracking}${url}\n\n` +
    `El envío es internacional, así que el rastreo puede tardar hasta 72 h en mostrar movimientos.\n` +
    `Gracias por comprar en ${STORE_URL}`
  );
}

function buildShippedHtml(n: ShippedNotification) {
  const escape = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const carrier = n.carrier ? ` con <strong>${escape(n.carrier)}</strong>` : '';
  const url = n.trackingUrl
    ? `<p><a href="${escape(n.trackingUrl)}">Seguir mi envío</a></p>`
    : '';
  return (
    `<div style="font-family:Arial,sans-serif;color:#1f2419">` +
    `<h2>Tu pedido ya está en camino</h2>` +
    `<p>Hola ${escape(n.customer || '')}, tu pedido de ${STORE_NAME} fue despachado${carrier}.</p>` +
    `<p>Número de seguimiento: <strong>${escape(n.tracking)}</strong></p>` +
    url +
    `<p style="color:#6b7280;font-size:13px">El envío es internacional: el rastreo puede tardar hasta 72 h en mostrar movimientos.</p>` +
    `<p><a href="${STORE_URL}">${STORE_URL}</a></p>` +
    `</div>`
  );
}

export async function notifyCustomerShipped(n: ShippedNotification): Promise<NotifyResult> {
  if (!n.email) return { sent: false, message: 'El pedido no tiene email del cliente.' };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SHIPPING_EMAIL_FROM ?? 'Youtumundial <pedidos@youtumundial.com>';
  if (!apiKey) {
    return { sent: false, message: 'Sin servicio de email configurado: avisá al cliente desde el panel.' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [n.email],
        subject: `Tu pedido ${n.supOrderId} ya fue enviado`,
        text: buildShippedText(n),
        html: buildShippedHtml(n),
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      return { sent: false, message: `Email rechazado (${response.status}): ${detail}` };
    }
    return { sent: true, message: 'Aviso enviado al cliente.' };
  } catch (error) {
    return { sent: false, message: `No se pudo enviar el email: ${(error as Error).message}` };
  }
}
