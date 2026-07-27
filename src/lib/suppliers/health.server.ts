/**
 * Diagnóstico de la conexión con SUP Dropshipping (solo servidor).
 *
 * Corre cada paso por separado y devuelve el error REAL de cada uno, para no
 * quedarse "a ciegas" cuando la tienda no muestra productos.
 */

export type SupHealthStep = {
  step: string;
  ok: boolean;
  detail: string;
  count?: number;
};

function msg(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.slice(0, 300);
}

export async function runSupHealthCheck(): Promise<{
  steps: SupHealthStep[];
  totalProducts: number;
}> {
  const steps: SupHealthStep[] = [];
  const {
    supCredentialsStatus,
    getAccessToken,
    listMemberListedProducts,
    listMemberImportQueue,
    listProducts,
  } = await import("./sup-api.server");

  // 1. Credenciales
  const creds = supCredentialsStatus();
  const hasLogin = Boolean(creds.hasUsername && creds.hasPassword);
  steps.push({
    step: "Credenciales configuradas",
    ok: hasLogin || Boolean(creds.hasToken),
    detail: hasLogin
      ? `Usuario y contraseña presentes · base ${creds.base}`
      : "Faltan SUP_USERNAME / SUP_PASSWORD en los secretos del proyecto",
  });

  // 2. Login
  let logged = false;
  try {
    const token = await getAccessToken();
    logged = Boolean(token);
    steps.push({
      step: "Login en SUP (token)",
      ok: logged,
      detail: logged ? "Token obtenido correctamente" : "SUP no devolvió token",
    });
  } catch (error) {
    steps.push({ step: "Login en SUP (token)", ok: false, detail: msg(error) });
  }

  let total = 0;

  if (logged) {
    // 3. Listed (secuencial: SUP invalida el token con llamadas simultáneas)
    try {
      const listed = await listMemberListedProducts({ page: 1, pageSize: 200 });
      total += listed.length;
      steps.push({
        step: "Productos publicados (Listed)",
        ok: true,
        count: listed.length,
        detail: listed.length ? `${listed.length} productos leídos` : "SUP respondió pero la lista vino vacía",
      });
    } catch (error) {
      steps.push({ step: "Productos publicados (Listed)", ok: false, detail: msg(error) });
    }

    // 4. Import queue
    try {
      const queue = await listMemberImportQueue({ page: 1, pageSize: 200 });
      total += queue.length;
      steps.push({
        step: "Cola de importados (Imported)",
        ok: true,
        count: queue.length,
        detail: queue.length ? `${queue.length} productos leídos` : "SUP respondió pero la cola vino vacía",
      });
    } catch (error) {
      steps.push({ step: "Cola de importados (Imported)", ok: false, detail: msg(error) });
    }

    // 5. Catálogo general (respaldo)
    try {
      const generic = await listProducts({ page: 1, pageSize: 5 });
      steps.push({
        step: "Catálogo general de SUP (respaldo)",
        ok: true,
        count: generic.length,
        detail: `${generic.length} productos de muestra`,
      });
    } catch (error) {
      steps.push({ step: "Catálogo general de SUP (respaldo)", ok: false, detail: msg(error) });
    }
  }

  return { steps, totalProducts: total };
}
