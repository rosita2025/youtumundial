/**
 * Verificación de la contraseña de administración (solo servidor).
 *
 * La contraseña vive en el secreto `ADMIN_PASSWORD` y nunca se envía al
 * navegador. La comparación se hace sobre hashes SHA-256 de longitud fija.
 */
async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

export async function isAdminPassword(candidate: unknown): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 8) return false;

  const provided = String(candidate ?? '');
  if (!provided || provided.length > 200) return false;

  const [a, b] = await Promise.all([sha256(provided), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}
