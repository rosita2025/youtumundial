/**
 * Cliente de la Open API de SUP Dropshipping (solo servidor).
 *
 * Endpoints según el panel de developer.supdropshipping.com:
 *   GET  /api/v1/categories.json
 *   GET  /api/v1/products.json
 *   GET  /api/v1/product/{id}.json
 *   POST /api/v1/purchase/order.json
 *
 * Credenciales (secrets del proyecto):
 *   SUP_API_BASE        (opcional, por defecto https://www.supdropshipping.com)
 *   SUP_APP_KEY         (App Key / Client ID)
 *   SUP_APP_SECRET      (App Secret)
 *   SUP_ACCESS_TOKEN    (opcional: si SUP te entrega el token ya generado)
 */

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

const SUP_DEFAULT_BASE = "https://www.supdropshipping.com";

function baseUrl(): string {
  const configured = (process.env.SUP_API_BASE || "").trim().replace(/\/+$/, "");
  // Ignoramos valores que apunten al portal de documentación / mock de YApi:
  // no son la API real y devuelven datos falsos.
  const isDocsOrMock =
    !configured ||
    /developer\.supdropshipping\.com/i.test(configured) ||
    /\/mock\//i.test(configured) ||
    /\.json$/i.test(configured);
  return isDocsOrMock ? SUP_DEFAULT_BASE : configured;
}


export function supCredentialsStatus() {
  return {
    base: baseUrl(),
    hasKey: Boolean(process.env.SUP_APP_KEY),
    hasSecret: Boolean(process.env.SUP_APP_SECRET),
    hasToken: Boolean(process.env.SUP_ACCESS_TOKEN),
  };
}

/**
 * Obtiene (y cachea) el access token de SUP.
 * Según el panel: POST /api/auth/login.json (application/x-www-form-urlencoded)
 * con username + password → { code, type, currency, message, data: { ...token } }
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const username = process.env.SUP_USERNAME;
  const password = process.env.SUP_PASSWORD;

  if (!username || !password) {
    const direct = process.env.SUP_ACCESS_TOKEN;
    if (direct) return direct;
    throw new Error(
      "Faltan las credenciales de SUP. Guardá SUP_USERNAME y SUP_PASSWORD en los secretos del proyecto.",
    );
  }

  const res = await fetch(`${baseUrl()}/api/auth/login.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ username, password }).toString(),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`SUP login [${res.status}]: ${text.slice(0, 400)}`);

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`SUP devolvió una respuesta no-JSON al iniciar sesión: ${text.slice(0, 200)}`);
  }

  if (Number(payload.code) !== 200 && Number(payload.code) !== 0) {
    throw new Error(`SUP login rechazado: ${String(payload.message ?? text.slice(0, 200))}`);
  }

  const data = (payload.data ?? {}) as Record<string, unknown>;
  const token = String(
    data.access_token ?? data.accessToken ?? data.token ?? data.auth_token ?? "",
  );
  if (!token) throw new Error(`SUP no devolvió token: ${text.slice(0, 300)}`);

  const expiresIn = Number(data.expires_in ?? data.expiresIn ?? 7200);
  cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}


/** Llamada genérica autenticada a la Open API de SUP. */
export async function supRequest<T = unknown>(
  path: string,
  options: { method?: string; query?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "access-token": token,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`SUP ${path} [${res.status}]: ${text.slice(0, 500)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`SUP ${path} devolvió una respuesta no-JSON: ${text.slice(0, 200)}`);
  }
}

type AnyRecord = Record<string, unknown>;

function pickList(payload: AnyRecord): AnyRecord[] {
  const data = (payload.data ?? payload) as AnyRecord;
  const candidates = [data.list, data.items, data.records, data.products, data.data, payload.list];
  for (const c of candidates) if (Array.isArray(c)) return c as AnyRecord[];
  return Array.isArray(data) ? (data as unknown as AnyRecord[]) : [];
}

/** Categorías del catálogo de SUP. */
export async function listCategories() {
  const payload = await supRequest<AnyRecord>("/api/v1/categories.json");
  return pickList(payload);
}

/**
 * Lista de productos de SUP.
 * Parámetros oficiales (spec YApi pid=13): limit (máx 200), page, goods_cate_id, title.
 * `title` acepta el nombre del producto o su SKU.
 */
export async function listProducts(params: { page?: number; pageSize?: number; keyword?: string; categoryId?: string } = {}) {
  const term = (params.keyword ?? "").trim();
  const payload = await supRequest<AnyRecord>("/api/v1/products.json", {
    query: {
      page: params.page ?? 1,
      limit: Math.min(Math.max(params.pageSize ?? 20, 1), 200),
      title: term || undefined,
      goods_cate_id: params.categoryId,
    },
  });
  return pickList(payload);
}

/** Detalle de un producto de SUP: GET /api/v1/product/{id}.json */
export async function getProductDetail(id: string) {
  const payload = await supRequest<AnyRecord>(`/api/v1/product/${encodeURIComponent(id)}.json`);
  return (payload.data ?? payload) as AnyRecord;
}

/** Variantes (talla/color) de un producto: GET /api/v1/product/{id}/variants.json */
export async function getProductVariants(id: string) {
  const payload = await supRequest<AnyRecord>(`/api/v1/product/${encodeURIComponent(id)}/variants.json`);
  const data = (payload.data ?? {}) as AnyRecord;
  const rows = pickList(payload);
  if (rows.length) return rows;
  const skus = data.skus ?? data.variants ?? data.sku_list;
  return Array.isArray(skus) ? (skus as AnyRecord[]) : [];
}



/** Crea una orden de compra en SUP: POST /api/v1/order.json */
export async function createPurchaseOrder(order: unknown) {
  return supRequest<AnyRecord>("/api/v1/order.json", { method: "POST", body: order });
}

/** Confirmación previa de la orden (totales y envío): GET /api/v1/order/confirmation.json */
export async function getOrderConfirmation(query: Record<string, string | number> = {}) {
  return supRequest<AnyRecord>("/api/v1/order/confirmation.json", { query });
}

/** Detalle de una orden en SUP (para leer estado y tracking). */
export async function getOrderDetail(id: string) {
  const payload = await supRequest<AnyRecord>(`/api/v1/order/${encodeURIComponent(id)}.json`);
  return (payload.data ?? payload) as AnyRecord;
}

/** Lista los pedidos de tu cuenta en SUP: GET /api/v1/order.json */
export async function listSupOrders(params: { page?: number; limit?: number } = {}) {
  const payload = await supRequest<AnyRecord>("/api/v1/order.json", {
    query: { page: params.page ?? 1, limit: Math.min(Math.max(params.limit ?? 20, 1), 100) },
  });
  return pickList(payload);
}

/** Link de pago del pedido en SUP (para pagarlo con la wallet): POST /api/v1/order/{id}/pay.json */
export async function getOrderPaymentLink(id: string) {
  const payload = await supRequest<AnyRecord>(`/api/v1/order/${encodeURIComponent(id)}/pay.json`, {
    method: "POST",
  });
  const data = (payload.data ?? payload) as AnyRecord;
  const link = data.pay_url ?? data.url ?? data.link ?? data.payment_url;
  return link ? String(link) : "";
}

/** Opciones de logística internacional y su costo: POST /api/v2/shipment.json */
export async function getShipmentOptions(body: Record<string, unknown>) {
  const payload = await supRequest<AnyRecord>("/api/v2/shipment.json", { method: "POST", body });
  return pickList(payload);
}



/** Países disponibles para envío. */
export async function listCountries() {
  const payload = await supRequest<AnyRecord>("/api/country.json");
  return pickList(payload);
}

