/**
 * Claves de idempotencia para operaciones que se pueden reintentar
 * (pedidos, clientes y carritos abandonados).
 *
 * Objetivo: que una misma operación lógica, aunque se llame varias veces
 * (doble clic, reintento automático, reenvío de webhook, recarga de la página
 * de "gracias"), se ejecute UNA sola vez y todas las llamadas reciban el
 * mismo resultado.
 *
 * Dos capas:
 *  1. In-flight: si la operación aún está corriendo, las llamadas repetidas
 *     esperan la misma promesa en vez de lanzar otra petición a Shopify.
 *  2. Cache de resultado: el resultado exitoso se recuerda un tiempo corto,
 *     así un reintento inmediato no vuelve a crear nada.
 *
 * Es memoria del servidor: la red de seguridad definitiva sigue siendo la
 * búsqueda por etiqueta/correo en Shopify antes de crear.
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutos
const MAX_ENTRIES = 500;

interface Entry<T> {
  promise: Promise<T>;
  /** Momento en que terminó (ms). `null` mientras sigue en vuelo. */
  settledAt: number | null;
  ok: boolean;
}

const entries = new Map<string, Entry<unknown>>();

function prune() {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (entry.settledAt !== null && now - entry.settledAt > DEFAULT_TTL_MS) {
      entries.delete(key);
    }
  }
  if (entries.size > MAX_ENTRIES) {
    const oldest = [...entries.entries()]
      .filter(([, e]) => e.settledAt !== null)
      .sort((a, b) => (a[1].settledAt ?? 0) - (b[1].settledAt ?? 0))[0];
    if (oldest) entries.delete(oldest[0]);
  }
}

/** Hash estable y corto (FNV-1a) para construir claves a partir de datos. */
export function stableHash(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** Construye una clave de idempotencia legible: `pedido:ref:hash`. */
export function idempotencyKey(scope: string, reference: string, payload?: unknown): string {
  const ref = String(reference).replace(/\s+/g, '').slice(0, 120);
  return payload === undefined ? `${scope}:${ref}` : `${scope}:${ref}:${stableHash(payload)}`;
}

export interface IdempotencyOptions {
  /** Cuánto recordar el resultado exitoso. Por defecto 10 minutos. */
  ttlMs?: number;
  /**
   * Si es `false`, un resultado "no ok" no se cachea y el siguiente intento
   * vuelve a ejecutar la operación. Por defecto se detecta con `result.ok`.
   */
  isSuccess?: (result: unknown) => boolean;
}

function defaultIsSuccess(result: unknown): boolean {
  if (result && typeof result === 'object' && 'ok' in result) {
    return Boolean((result as { ok?: unknown }).ok);
  }
  return true;
}

/**
 * Ejecuta `fn` una sola vez por clave.
 * Las llamadas simultáneas comparten la misma promesa; las posteriores dentro
 * del TTL reciben el resultado cacheado sin volver a llamar a Shopify.
 */
export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  options: IdempotencyOptions = {},
): Promise<T> {
  prune();

  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  const existing = entries.get(key) as Entry<T> | undefined;
  if (existing) {
    const fresh =
      existing.settledAt === null || (existing.ok && Date.now() - existing.settledAt <= ttl);
    if (fresh) return existing.promise;
    entries.delete(key);
  }

  const isSuccess = options.isSuccess ?? defaultIsSuccess;
  const entry: Entry<T> = { promise: undefined as unknown as Promise<T>, settledAt: null, ok: false };

  entry.promise = (async () => {
    try {
      const result = await fn();
      entry.ok = isSuccess(result);
      return result;
    } catch (error) {
      entry.ok = false;
      throw error;
    } finally {
      entry.settledAt = Date.now();
      // Los fallos no se cachean: el siguiente intento debe poder reintentar.
      if (!entry.ok) entries.delete(key);
    }
  })();

  entries.set(key, entry as Entry<unknown>);
  return entry.promise;
}

/** Olvida una clave (por ejemplo, tras cerrar un carrito abandonado). */
export function forgetIdempotencyKey(key: string) {
  entries.delete(key);
}
