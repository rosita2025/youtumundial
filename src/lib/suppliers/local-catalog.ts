/** Catálogo importado de SUP guardado en el navegador (hasta activar Lovable Cloud). */

import type { SupRawProduct } from "./sup";

const KEY = "youtumundial:sup-catalog:v1";

export function readSupCatalog(): SupRawProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SupRawProduct[]) : [];
  } catch {
    return [];
  }
}

export function writeSupCatalog(products: SupRawProduct[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(products));
  window.dispatchEvent(new CustomEvent("sup-catalog-changed"));
}

export function mergeSupCatalog(incoming: SupRawProduct[]) {
  const current = readSupCatalog();
  const byId = new Map(current.map((p) => [String(p.id), p]));
  let added = 0;
  for (const p of incoming) {
    const id = String(p.id);
    if (!byId.has(id)) added += 1;
    byId.set(id, p);
  }
  const merged = [...byId.values()];
  writeSupCatalog(merged);
  return { added, total: merged.length };
}

export function clearSupCatalog() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("sup-catalog-changed"));
}
