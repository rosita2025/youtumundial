/**
 * Selección manual de productos publicados en Youtumundial.
 *
 * Vos decidís qué productos de SUP se ven en la tienda, sin importar si en SUP
 * figuran listados en Etsy u otra tienda externa. Mientras no haya selección,
 * la tienda muestra todo el catálogo sincronizado (comportamiento anterior).
 */

const KEY = "youtumundial:sup-published:v1";
export const PUBLISHED_CHANGED_EVENT = "sup-published-changed";

export function readPublishedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function writePublishedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify([...new Set(ids.map(String))]));
  window.dispatchEvent(new CustomEvent(PUBLISHED_CHANGED_EVENT));
}

export function isPublished(id: string | number): boolean {
  return readPublishedIds().includes(String(id));
}

export function togglePublished(id: string | number): boolean {
  const key = String(id);
  const current = readPublishedIds();
  const next = current.includes(key) ? current.filter((x) => x !== key) : [...current, key];
  writePublishedIds(next);
  return next.includes(key);
}

export function clearPublished() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(PUBLISHED_CHANGED_EVENT));
}
