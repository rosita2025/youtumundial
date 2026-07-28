import { createServerFn } from '@tanstack/react-start';

/** Verifica la contraseña del panel de administración. */
export const verifyAdminPassword = createServerFn({ method: 'POST' })
  .inputValidator((input: { password: string }) => ({
    password: String(input?.password ?? '').slice(0, 200),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; configured: boolean }> => {
    const { isAdminToken } = await import('./guard.server');
    return {
      ok: isAdminToken(data.password),
      configured: Boolean(process.env.ADMIN_PASSWORD),
    };
  });
