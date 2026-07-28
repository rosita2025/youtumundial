/**
 * Alertas internas al administrador (SOLO SERVIDOR).
 *
 * Se usan cuando una tarea automática falla de forma persistente (por ejemplo
 * la sincronización de carritos abandonados con Shopify). Nunca se muestran al
 * cliente ni se devuelven al navegador: solo van al log del servidor y, si hay
 * email configurado, al correo del administrador.
 *
 * Reglas:
 * - Nunca lanza: una alerta fallida jamás puede romper el flujo de compra.
 * - Anti-spam: la misma clave de alerta no se reenvía por email antes de
 *   `ALERT_COOLDOWN_MS` (se recuerda en memoria del worker).
 * - Nunca incluye tokens, claves ni datos de pago.
 */

const ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const lastSentAt = new Map<string, number>();

export interface AdminAlertInput {
  /** Clave estable de la alerta, usada para no repetir el mismo email. */
  key: string;
  /** Título corto, aparece en el asunto. */
  title: string;
  /** Causa concreta del fallo (mensaje ya saneado). */
  cause: string;
  /** Datos de contexto no sensibles. */
  context?: Record<string, string | number | undefined>;
}

export interface AdminAlertResult {
  logged: true;
  emailed: boolean;
}

function adminEmail(): string | undefined {
  const value = (process.env.ADMIN_ALERT_EMAIL ?? process.env.SHIPPING_EMAIL_FROM ?? '').trim();
  const match = value.match(/[^<>\s]+@[^<>\s]+\.[^<>\s]+/);
  return match ? match[0] : undefined;
}

function contextLines(context: AdminAlertInput['context']) {
  if (!context) return '';
  return Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/** Registra la causa en el log y avisa al admin por email (si está configurado). */
export async function alertAdmin(input: AdminAlertInput): Promise<AdminAlertResult> {
  const cause = String(input.cause ?? '').slice(0, 500);
  const details = contextLines(input.context);

  // 1) Log de causa: siempre, aunque no haya email configurado.
  console.error(
    `[alerta-admin] ${input.title} :: ${cause}${details ? ` :: ${details.replace(/\n/g, ' | ')}` : ''}`,
  );

  const to = adminEmail();
  const apiKey = process.env.RESEND_API_KEY;
  if (!to || !apiKey) return { logged: true, emailed: false };

  const now = Date.now();
  const previous = lastSentAt.get(input.key) ?? 0;
  if (now - previous < ALERT_COOLDOWN_MS) return { logged: true, emailed: false };
  lastSentAt.set(input.key, now);

  const from = process.env.SHIPPING_EMAIL_FROM ?? 'Youtumundial <pedidos@youtumundial.com>';
  const text =
    `Fallo automático en la tienda Youtumundial.\n\n` +
    `${input.title}\n\n` +
    `Causa: ${cause}\n` +
    (details ? `\n${details}\n` : '') +
    `\nEste aviso es automático y no se repite antes de 15 minutos.`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[Youtumundial] ${input.title}`,
        text,
      }),
    });
    return { logged: true, emailed: true };
  } catch (error) {
    console.error('[alerta-admin] no se pudo enviar el email:', (error as Error).message);
    return { logged: true, emailed: false };
  }
}
