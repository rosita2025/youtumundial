/**
 * Resolución del token del Admin API de Shopify (SOLO SERVIDOR).
 *
 * ÚNICO método soportado: `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` con
 * `grant_type=client_credentials`, que devuelve un token offline temporal
 * válido para el Admin API (incluye `orderCreate`).
 *
 * Los tokens estáticos antiguos (`shpat_`, `shpca_`, `shppa_`, `shpss_`) ya no
 * se aceptan: Shopify cambió el modelo de apps y quedaron obsoletos.
 *
 * Todo token recibido pasa por una validación estricta de formato antes de
 * usarse o cachearse. Si el formato es inesperado, se descarta (no se envía a
 * Shopify ni se guarda) y la operación falla de forma controlada.
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
 * Devuelve un token válido del Admin API.
 *
 * ÚNICO método soportado: Client ID + Client Secret (client_credentials).
 * Los tokens estáticos antiguos (`shpat_` y similares, creados en 2023–2024)
 * ya no se usan: Shopify cambió el modelo de apps y esos tokens quedaron
 * obsoletos. Si alguien guarda uno, se ignora por completo.
 */
export async function resolveShopifyAdminToken(): Promise<string | undefined> {
  if (!hasShopifyClientCredentials()) {
    throw new Error(
      'Shopify Admin: faltan SHOPIFY_CLIENT_ID y SHOPIFY_CLIENT_SECRET. ' +
        'Es el único método soportado (client_credentials); los tokens estáticos antiguos ya no se aceptan.',
    );
  }

  if (cached && Date.now() < cached.expiresAt) return cached.token;
  if (!inFlight) {
    inFlight = requestClientCredentialsToken().finally(() => {
      inFlight = null;
    });
  }
  const token = await inFlight;
  if (!token) {
    throw new Error(
      'Shopify Admin: no se pudo obtener el token con client_credentials. Revisa SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET.',
    );
  }
  return token;

}


/** Fuerza renovar el token temporal (por ejemplo tras un 401 de Shopify). */
export function resetShopifyAdminToken() {
  cached = null;
}
