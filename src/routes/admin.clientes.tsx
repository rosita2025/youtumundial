import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Loader2, Search, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  listAdminCustomers,
} from '@/lib/admin/customers.functions';
import type { AdminCustomerRow } from '@/lib/shopify/customers-list.server';

const TAG_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'newsletter-youtumundial', label: 'Newsletter Youtumundial' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'youtumundial-checkout', label: 'Compradores / checkout' },
  { value: 'carrito-abandonado', label: 'Carrito abandonado' },
];

export const Route = createFileRoute('/admin/clientes')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Clientes | Admin Youtumundial' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'description', content: 'Segmentación interna de clientes de Youtumundial.' },
      { property: 'og:title', content: 'Clientes | Admin Youtumundial' },
      { property: 'og:description', content: 'Panel interno de segmentación de clientes.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AdminCustomersPage,
});

function AdminCustomersPage() {
  const run = useServerFn(listAdminCustomers);

  const [password, setPassword] = useState('');
  const [tags, setTags] = useState<string[]>(['newsletter-youtumundial']);
  const [search, setSearch] = useState('');
  const [onlySubscribed, setOnlySubscribed] = useState(false);

  const [rows, setRows] = useState<AdminCustomerRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const toggleTag = (value: string) =>
    setTags((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));

  const load = async (nextCursor: string | null = null) => {
    if (!password) {
      setError('Ingresá la contraseña de administración.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await run({
        data: { password, tags, search, onlySubscribed, cursor: nextCursor },
      });
      if (!result.ok) {
        setError(result.message ?? 'No se pudo cargar la lista.');
        if (!nextCursor) setRows([]);
        return;
      }
      setRows((prev) => (nextCursor ? [...prev, ...result.customers] : result.customers));
      setCursor(result.endCursor);
      setHasNext(result.hasNextPage);
      setLoaded(true);
    } catch {
      setError('No se pudo cargar la lista.');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = ['email', 'nombre', 'telefono', 'pais', 'suscrito', 'pedidos', 'etiquetas'];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = rows.map((r) =>
      [
        r.email ?? '',
        r.name,
        r.phone ?? '',
        r.country ?? '',
        r.subscribed ? 'si' : 'no',
        String(r.ordersCount),
        r.tags.join(' | '),
      ]
        .map(escape)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...body].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes-youtumundial.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container-wide py-10 space-y-8">
        <header className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <div>
            <h1 className="font-heading text-2xl font-medium">Clientes de Shopify</h1>
            <p className="text-sm text-muted-foreground">
              Segmentá por etiqueta (newsletter, compradores, carritos abandonados).
            </p>
          </div>
        </header>

        <section className="rounded-lg border border-border p-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Contraseña de administración</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-search">Buscar (correo o nombre)</Label>
              <Input
                id="admin-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ana@ejemplo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-4">
              {TAG_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={tags.includes(opt.value)}
                    onCheckedChange={() => toggleTag(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={onlySubscribed}
                  onCheckedChange={(v) => setOnlySubscribed(Boolean(v))}
                />
                Solo suscritos al marketing
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => load(null)} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar clientes
            </Button>
            {rows.length > 0 && (
              <Button variant="outline" onClick={exportCsv}>
                Exportar CSV
              </Button>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </section>

        {loaded && (
          <section className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {rows.length} cliente(s) listados{hasNext ? ' (hay más)' : ''}.
            </p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Correo</th>
                    <th className="p-3 font-medium">Nombre</th>
                    <th className="p-3 font-medium">País</th>
                    <th className="p-3 font-medium">Suscrito</th>
                    <th className="p-3 font-medium">Pedidos</th>
                    <th className="p-3 font-medium">Etiquetas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="p-3">{row.email ?? '—'}</td>
                      <td className="p-3">{row.name}</td>
                      <td className="p-3">{row.country ?? '—'}</td>
                      <td className="p-3">{row.subscribed ? 'Sí' : 'No'}</td>
                      <td className="p-3">{row.ordersCount}</td>
                      <td className="p-3 text-muted-foreground">{row.tags.join(', ') || '—'}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="p-4 text-muted-foreground" colSpan={6}>
                        No hay clientes con esos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {hasNext && (
              <Button variant="outline" onClick={() => load(cursor)} disabled={loading}>
                Cargar más
              </Button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
