/**
 * Historial de importaciones de reseñas (se guarda en el navegador).
 *
 * Registra cada intento: de dónde salieron las reseñas (URL de 1688, archivo
 * HTML/CSV/JSON, texto pegado), cuántas se publicaron, cuántas eran repetidas
 * y qué falló, para poder auditar el panel /admin/resenas.
 */

export type ImportSource = "url" | "pegado" | "archivo" | "manual";
export type ImportStatus = "ok" | "parcial" | "error";

export interface ImportLogEntry {
  id: string;
  date: string; // ISO
  source: ImportSource;
  origin: string; // URL, nombre de archivo o descripción del pegado
  slug: string;
  found: number; // reseñas detectadas
  published: number; // reseñas nuevas publicadas
  duplicates: number;
  status: ImportStatus;
  message?: string;
}

export const IMPORT_LOG_KEY = "youtumundial:reviews-import-log";
const MAX_ENTRIES = 100;

const listeners = new Set<() => void>();

export function readImportLog(): ImportLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(IMPORT_LOG_KEY);
    const parsed = raw ? (JSON.parse(raw) as ImportLogEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: ImportLogEntry[]) {
  window.localStorage.setItem(IMPORT_LOG_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  listeners.forEach((l) => l());
}

export function logImport(entry: Omit<ImportLogEntry, "id" | "date">): ImportLogEntry {
  const full: ImportLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
  };
  if (typeof window !== "undefined") persist([full, ...readImportLog()]);
  return full;
}

export function clearImportLog() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(IMPORT_LOG_KEY);
  listeners.forEach((l) => l());
}

export function subscribeImportLog(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === IMPORT_LOG_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
