/**
 * Estado de envío recibido por webhook desde SUP Dropshipping.
 *
 * Guardado en memoria del servidor (dura mientras el servidor está caliente).
 * Al activar Lovable Cloud se reemplaza por una tabla `shipments`.
 */

export interface ShipmentStatus {
  supOrderId: string;
  status: string;
  tracking?: string;
  carrier?: string;
  trackingUrl?: string;
  updatedAt: string;
}

const store = new Map<string, ShipmentStatus>();

export function putShipmentStatus(entry: ShipmentStatus) {
  store.set(entry.supOrderId, entry);
  // Evitamos crecer sin límite en memoria.
  if (store.size > 500) {
    const oldest = [...store.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
    if (oldest) store.delete(oldest.supOrderId);
  }
}

export function getShipmentStatus(supOrderId: string): ShipmentStatus | null {
  return store.get(supOrderId) ?? null;
}
