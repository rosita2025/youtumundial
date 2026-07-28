/**
 * Reintentos con espera exponencial para llamadas a APIs externas
 * (Shopify Admin, SUP Dropshipping).
 *
 * Solo se reintenta cuando la llamada falla por error de red o del proveedor;
 * la deduplicación de pedidos se resuelve aparte, buscando el pedido por su
 * referencia antes de crearlo.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const base = options.baseDelayMs ?? 600;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = base * 2 ** (attempt - 1);
      if (options.label) {
        console.warn(`${options.label}: intento ${attempt} falló, reintentando en ${delay}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
