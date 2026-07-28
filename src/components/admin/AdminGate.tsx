import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { verifyAdminPassword } from '@/lib/admin/guard.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';

const STORAGE_KEY = 'ytm-admin-key';

/** Contraseña guardada en la pestaña actual (nunca en el código del cliente). */
export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(STORAGE_KEY) ?? '';
}

export function clearAdminToken() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Bloquea el panel hasta validar la contraseña contra el servidor.
 * La verificación real vive en cada función de servidor: esto es solo la UI.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const verify = useServerFn(verifyAdminPassword);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = getAdminToken();
    if (!saved) {
      setChecking(false);
      return;
    }
    verify({ data: { password: saved } })
      .then((res) => {
        if (res.ok) setUnlocked(true);
        else clearAdminToken();
      })
      .catch(() => clearAdminToken())
      .finally(() => setChecking(false));
  }, [verify]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await verify({ data: { password } });
      if (!res.configured) {
        setError('Falta configurar la contraseña del panel (ADMIN_PASSWORD).');
        return;
      }
      if (!res.ok) {
        setError('Contraseña incorrecta.');
        return;
      }
      window.sessionStorage.setItem(STORAGE_KEY, password);
      setUnlocked(true);
    } catch {
      setError('No se pudo verificar la contraseña.');
    }
  };

  if (checking) {
    return <div className="container mx-auto px-4 py-24 text-center text-muted-foreground">Verificando acceso…</div>;
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="container mx-auto px-4 py-24 max-w-sm">
      <form onSubmit={submit} className="rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h1 className="font-medium text-lg">Panel privado</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Esta sección tiene datos de clientes y costos del proveedor. Ingresá la contraseña del panel.
        </p>
        <div className="space-y-2">
          <Label htmlFor="admin-password">Contraseña</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </div>
  );
}
