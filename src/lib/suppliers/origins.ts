/**
 * Origen de cada producto importado + lista de orígenes desautorizados.
 *
 * Permite auditar de dónde viene cada producto (proveedor, tienda/shop ID,
 * ID de origen y fecha de importación) y desautorizar en un clic cualquier
 * origen que no sea de Youtumundial. Los orígenes bloqueados se guardan en
 * este navegador y se aplican al catálogo antes de mostrarlo.
 */

import type { Product, ProductOrigin } from "../data/types";

const STORAGE_KEY = "ytm_blocked_origins_v1";

export type OriginKey = string;

/** Clave estable de un origen: proveedor + tienda + id de origen. */
export function originKey(origin: ProductOrigin | undefined): OriginKey {
  if (!origin) return "desconocido";
  return [origin.supplier, origin.shopId || "sin-tienda", origin.sourceId || "sin-id"]
    .map((v) => String(v).trim().toLowerCase())
    .join("|");
}

/** Clave de agrupación por proveedor + tienda (para desautorizar en bloque). */
export function originGroupKey(origin: ProductOrigin | undefined): OriginKey {
  if (!origin) return "desconocido";
  return [origin.supplier, origin.shopId || "sin-tienda"]
    .map((v) => String(v).trim().toLowerCase())
    .join("|");
}

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function write(keys: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(keys)]));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function getBlockedOrigins(): string[] {
  return read();
}

export function blockOrigin(key: OriginKey) {
  write([...read(), key]);
}

export function unblockOrigin(key: OriginKey) {
  write(read().filter((k) => k !== key));
}

export function clearBlockedOrigins() {
  write([]);
}

export function isOriginBlocked(origin: ProductOrigin | undefined): boolean {
  const blocked = new Set(read());
  return blocked.has(originKey(origin)) || blocked.has(originGroupKey(origin));
}

/** Quita del catálogo los productos cuyo origen fue desautorizado. */
export function filterAuthorizedOrigins(products: Product[]): Product[] {
  const blocked = new Set(read());
  if (blocked.size === 0) return products;
  return products.filter(
    (p) => !blocked.has(originKey(p.origin)) && !blocked.has(originGroupKey(p.origin)),
  );
}
