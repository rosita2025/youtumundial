/**
 * Puerta de acceso del panel de administración (solo servidor).
 *
 * Las páginas /admin/* muestran datos de clientes, costos del proveedor y
 * permiten disparar pedidos reales, así que cada función de servidor del panel
 * exige la contraseña guardada en el secreto ADMIN_PASSWORD.
 */

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isAdminToken(token: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  const provided = String(token ?? '');
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}

/** Lanza si el pedido no trae la contraseña del panel. */
export function assertAdmin(token: unknown): void {
  if (!isAdminToken(token)) {
    throw new Error('No autorizado. Ingresá la contraseña del panel.');
  }
}
