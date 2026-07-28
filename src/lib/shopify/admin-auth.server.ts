/**
 * Resolución del token del Admin API de Shopify (SOLO SERVIDOR).
 *
 * Orden de preferencia:
 *  0. `SHOPIFY_ADMIN_AUTOMATION_TOKEN` — token de automatización (CI/CD) de la app.
 *  1. `SHOPIFY_ADMIN_ORDERS_TOKEN` — token offline `shpat_` de app privada.
 *  2. `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` — intercambio
 *     `grant_type=client_credentials` contra Shopify, que devuelve un token
 *     offline temporal válido para el Admin API (incluye `orderCreate`).
 *  3. `SHOPIFY_ACCESS_TOKEN` — token de la integración (solo productos).
 *
 * Ningún valor se registra en logs ni se envía al navegador. El token temporal
 * se guarda solo en memoria del worker y se renueva antes de expirar.
 */

import { SHOPIFY_STORE_PERMANENT_DOMAIN } from './storefront';
import { assertAllowedShopifyUrl } from '../security/connection-audit';

const OAUTH_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/admin/oauth/access_token`;

let cached: { token: string; expiresAt: number } | null = null;
let inFlight: Promise<string | null> | null = null;

/** Margen de seguridad antes de la expiración real. */
const RENEW_MARGIN_MS = 60_000;

function env(name: string): string | undefined {
  const value = process.env[name];
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length ? trimmed : undefined;
}

export function hasShopifyClientCredentials(): boolean {
  return Boolean(env('SHOPIFY_CLIENT_ID') && env('SHOPIFY_CLIENT_SECRET'));
}

async function requestClientCredentialsToken(): Promise<string | null> {
  const clientId = env('SHOPIFY_CLIENT_ID');
  const clientSecret = env('SHOPIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  assertAllowedShopifyUrl(OAUTH_URL);

  try {
    const response = await fetch(OAUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      // No incluimos el cuerpo: puede repetir credenciales.
      console.error('shopify client_credentials HTTP', response.status);
      return null;
    }

    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    const token = typeof json.access_token === 'string' ? json.access_token.trim() : '';
    if (!token) {
      console.error('shopify client_credentials: respuesta sin access_token');
      return null;
    }

    const ttlMs = Math.max(60_000, Number(json.expires_in ?? 3600) * 1000);
    cached = { token, expiresAt: Date.now() + ttlMs - RENEW_MARGIN_MS };
    return token;
  } catch (error) {
    console.error('shopify client_credentials error', (error as Error).message);
    return null;
  }
}

/**
 * Tokens estáticos válidos para el Admin API de Shopify.
 * Solo aceptamos formatos oficiales (`shpat_`, `shpca_`, `shppa_`, `shpss_`).
 * Cualquier otro valor pegado por error se ignora para no romper la sincronización.
 */
function staticAdminToken(): string | undefined {
  const candidates = [
    env('SHOPIFY_ADMIN_ORDERS_TOKEN'),
    env('SHOPIFY_ADMIN_AUTOMATION_TOKEN'),
  ];
  return candidates.find((t) => !!t && /^shp(at|ca|pa|ss)_/.test(t));
}

/** Devuelve un token válido del Admin API o `undefined` si no hay ninguno. */
export async function resolveShopifyAdminToken(): Promise<string | undefined> {
  // 1. Client credentials (método actual de las apps de Shopify).
  if (hasShopifyClientCredentials()) {
    if (cached && Date.now() < cached.expiresAt) return cached.token;
    if (!inFlight) {
      inFlight = requestClientCredentialsToken().finally(() => {
        inFlight = null;
      });
    }
    const token = await inFlight;
    if (token) return token;
  }

  // 2. Token estático offline, si existe y tiene formato válido.
  const explicit = staticAdminToken();
  if (explicit) return explicit;

  // 3. Token de la integración (normalmente solo productos).
  return env('SHOPIFY_ACCESS_TOKEN');
}


/** Fuerza renovar el token temporal (por ejemplo tras un 401 de Shopify). */
export function resetShopifyAdminToken() {
  cached = null;
}
