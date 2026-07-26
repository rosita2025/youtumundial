const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-sm text-destructive">
        Los pagos en vivo todavía no están configurados. Completá la activación para cobrar de verdad.
      </div>
    );
  }
  if (clientToken.startsWith('pk_test_')) {
    return (
      <div className="w-full bg-accent/40 border-b border-border px-4 py-2 text-center text-sm text-foreground">
        Todos los pagos en la vista previa son de prueba (tarjeta 4242 4242 4242 4242).
      </div>
    );
  }
  return null;
}
