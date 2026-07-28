/**
 * Auditoría automática de conexiones externas (solo tienda propia).
 *
 * Objetivo: garantizar que la tienda solo habla con **mi** tienda de Shopify
 * y con **mi** cuenta de proveedor (SUP Dropshipping). Cualquier dominio,
 * tienda o proveedor distinto se bloquea antes de hacer la petición.
 *
 * Se usa en:
 *  - `src/lib/shopify/storefront.ts`  (catálogo Storefront API)
 *  - `src/lib/suppliers/sup-api.server.ts` (Open API del proveedor)
 *  - `/api/public/audit/connections` (reporte de auditoría)
 */

/** Única tienda Shopify permitida. */
export const ALLOWED_SHOPIFY_DOMAIN = "youtumundial-4ndozgzu.myshopify.com";

/** Hosts permitidos para el proveedor (SUP Dropshipping). */
export const ALLOWED_SUPPLIER_HOSTS = [
  "www.supdropshipping.com",
  "supdropshipping.com",
  "api.supdropshipping.com",
];

/** Hosts permitidos de Shopify (tienda + CDN de imágenes). */
export const ALLOWED_SHOPIFY_HOSTS = [
  ALLOWED_SHOPIFY_DOMAIN,
  "cdn.shopify.com",
];

export class ConnectionNotAllowedError extends Error {
  constructor(host: string, kind: string) {
    super(`Conexión bloqueada: "${host}" no pertenece a ${kind} de Youtumundial.`);
    this.name = "ConnectionNotAllowedError";
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Verifica que la URL apunte a MI tienda de Shopify (o su CDN). */
export function assertAllowedShopifyUrl(url: string): void {
  const host = hostOf(url);
  if (!isHttps(url) || !ALLOWED_SHOPIFY_HOSTS.includes(host)) {
    throw new ConnectionNotAllowedError(host || url, "la tienda Shopify");
  }
}

/** Verifica que la URL apunte a MI proveedor (SUP Dropshipping). */
export function assertAllowedSupplierUrl(url: string): void {
  const host = hostOf(url);
  if (!isHttps(url) || !ALLOWED_SUPPLIER_HOSTS.includes(host)) {
    throw new ConnectionNotAllowedError(host || url, "el proveedor autorizado");
  }
}

/** ¿El dominio de una tienda Shopify es el mío? */
export function isOwnShopifyDomain(domain: unknown): boolean {
  return String(domain ?? "").trim().toLowerCase() === ALLOWED_SHOPIFY_DOMAIN;
}

/**
 * ¿Un GID/ID de Shopify pertenece a la tienda propia?
 * (Los GIDs no llevan dominio, así que validamos el formato esperado.)
 */
export function isValidShopifyGid(gid: unknown, type = "Product"): boolean {
  return new RegExp(`^gid://shopify/${type}/\\d+$`).test(String(gid ?? ""));
}

export interface ConnectionAuditCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ConnectionAuditReport {
  ok: boolean;
  checkedAt: string;
  store: string;
  checks: ConnectionAuditCheck[];
}

/**
 * Auditoría automática: revisa que la configuración activa apunte solo a mis
 * cuentas. No devuelve secretos, solo si están presentes y a dónde apuntan.
 */
export function auditConnections(input: {
  shopifyUrl: string;
  supplierBase: string;
  supplierCredentials: Record<string, boolean>;
  publishedProductIds: string[];
}): ConnectionAuditReport {
  const checks: ConnectionAuditCheck[] = [];

  const shopifyHost = hostOf(input.shopifyUrl);
  checks.push({
    name: "shopify_domain",
    ok: shopifyHost === ALLOWED_SHOPIFY_DOMAIN,
    detail: shopifyHost || "sin configurar",
  });

  const supplierHost = hostOf(input.supplierBase);
  checks.push({
    name: "supplier_host",
    ok: ALLOWED_SUPPLIER_HOSTS.includes(supplierHost),
    detail: supplierHost || "sin configurar",
  });

  const hasSupplierAuth =
    Boolean(input.supplierCredentials.hasUsername && input.supplierCredentials.hasPassword) ||
    Boolean(input.supplierCredentials.hasToken);
  checks.push({
    name: "supplier_credentials",
    ok: hasSupplierAuth,
    detail: hasSupplierAuth ? "credenciales propias presentes" : "faltan credenciales",
  });

  checks.push({
    name: "catalog_allowlist",
    ok: input.publishedProductIds.length > 0,
    detail: `${input.publishedProductIds.length} producto(s) propios habilitados`,
  });

  return {
    ok: checks.every((c) => c.ok),
    checkedAt: new Date().toISOString(),
    store: ALLOWED_SHOPIFY_DOMAIN,
    checks,
  };
}
