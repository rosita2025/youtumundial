/**
 * Registro de auditoría de sincronizaciones con Shopify (SOLO SERVIDOR).
 *
 * Cada intento de sincronizar un cliente, un pedido o un borrador de carrito
 * abandonado deja una entrada con:
 *  - entidad y operación (customer/order/draft · crear, actualizar, cerrar)
 *  - referencia interna del checkout/pedido
 *  - IDs devueltos por Shopify (customerId, orderId/orderName, draftId)
 *  - estado final (ok, rechazado, error, omitido) y causa saneada
 *
 * Reglas de seguridad:
 *  - Nunca se escriben tokens, claves, datos de pago ni direcciones completas.
 *  - El correo se guarda enmascarado (j***@dominio.com).
 *  - El buffer vive en memoria del worker y NO se expone por HTTP: la auditoría
 *    se consulta en los logs del servidor.
 *  - Cuando Shopify rechaza una actualización (userErrors) o falla de forma
 *    definitiva, se dispara además una alerta al administrador.
 */

export type SyncEntity = 'customer' | 'order' | 'draft';
export type SyncAction = 'create' | 'update' | 'upsert' | 'close';
export type SyncStatus = 'ok' | 'rejected' | 'error' | 'skipped';

export interface SyncAuditInput {
  entity: SyncEntity;
  action: SyncAction;
  status: SyncStatus;
  /** Referencia interna (checkout/pedido) usada como clave de idempotencia. */
  reference?: string;
  /** IDs devueltos por Shopify. Solo identificadores, nunca datos personales. */
  ids?: Record<string, string | number | undefined>;
  /** Correo del comprador: se enmascara automáticamente. */
  email?: string;
  /** Causa del fallo o rechazo, ya saneada. */
  cause?: string;
  attempts?: number;
  /** Duración del intento en ms, si se midió. */
  durationMs?: number;
  /** true para no enviar alerta aunque el estado sea de fallo. */
  silent?: boolean;
}

export interface SyncAuditEntry extends Omit<SyncAuditInput, 'email' | 'silent'> {
  at: string;
  email?: string;
}

const MAX_ENTRIES = 200;
const entries: SyncAuditEntry[] = [];

function maskEmail(email?: string) {
  const value = String(email ?? '').trim().toLowerCase();
  if (!value.includes('@')) return undefined;
  const [user, domain] = value.split('@');
  return `${user.slice(0, 1)}***@${domain}`;
}

function cleanIds(ids: SyncAuditInput['ids']) {
  if (!ids) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(ids)) {
    if (value === undefined || value === '') continue;
    out[key] = String(value).slice(0, 120);
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Guarda la entrada de auditoría, la imprime en el log y, si el estado es de
 * fallo/rechazo, avisa al administrador. Nunca lanza.
 */
export async function recordSync(input: SyncAuditInput): Promise<SyncAuditEntry> {
  const entry: SyncAuditEntry = {
    at: new Date().toISOString(),
    entity: input.entity,
    action: input.action,
    status: input.status,
    ...(input.reference ? { reference: String(input.reference).slice(0, 80) } : {}),
    ...(cleanIds(input.ids) ? { ids: cleanIds(input.ids) } : {}),
    ...(maskEmail(input.email) ? { email: maskEmail(input.email) } : {}),
    ...(input.cause ? { cause: String(input.cause).slice(0, 300) } : {}),
    ...(input.attempts ? { attempts: input.attempts } : {}),
    ...(input.durationMs !== undefined ? { durationMs: Math.round(input.durationMs) } : {}),
  };

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);

  const line = `[sync-audit] ${JSON.stringify(entry)}`;
  if (entry.status === 'ok' || entry.status === 'skipped') console.log(line);
  else console.error(line);

  if ((entry.status === 'rejected' || entry.status === 'error') && !input.silent) {
    try {
      const { alertAdmin } = await import('@/lib/notifications/admin-alert.server');
      await alertAdmin({
        key: `sync-${entry.entity}-${entry.action}-${entry.status}`,
        title:
          entry.status === 'rejected'
            ? `Shopify rechazó la sincronización (${entry.entity}/${entry.action})`
            : `Fallo al sincronizar con Shopify (${entry.entity}/${entry.action})`,
        cause: entry.cause ?? 'Sin detalle.',
        context: {
          referencia: entry.reference,
          correo: entry.email,
          intentos: entry.attempts,
          ...(entry.ids ?? {}),
        },
      });
    } catch (error) {
      console.error('[sync-audit] alerta no enviada:', (error as Error).message);
    }
  }

  return entry;
}

/** Últimas entradas en memoria (uso interno/diagnóstico en el servidor). */
export function recentSyncAudit(limit = 50): SyncAuditEntry[] {
  return entries.slice(-Math.max(1, Math.min(limit, MAX_ENTRIES)));
}
