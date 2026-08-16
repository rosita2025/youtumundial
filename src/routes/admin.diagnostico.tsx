import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getShopifySyncStatus } from '@/lib/shopify/admin.server';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, XCircle, ShieldAlert, Key } from 'lucide-react';

export const Route = createFileRoute('/admin/diagnostico')({
  component: ShopifyDiagnostics,
});

function ShopifyDiagnostics() {
  const { data: status } = useSuspenseQuery({
    queryKey: ['shopify-sync-status'],
    queryFn: () => getShopifySyncStatus(),
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24 max-w-2xl">
        <h1 className="text-3xl font-display mb-8">Shopify Integration Diagnostics</h1>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status.configured ? (
                  <CheckCircle2 className="text-green-500" />
                ) : (
                  <XCircle className="text-destructive" />
                )}
                Configuration Status
              </CardTitle>
              <CardDescription>
                Checking if API credentials are set in the server environment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status.configured ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                  <Key className="h-4 w-4" />
                  Credentials (Client ID & Secret) are present.
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {status.ok ? (
                  <CheckCircle2 className="text-green-500" />
                ) : (
                  <ShieldAlert className="text-amber-500" />
                )}
                Permission Scopes
              </CardTitle>
              <CardDescription>
                Permissions granted to your Shopify Custom App.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Granted Scopes:</h3>
                <div className="flex flex-wrap gap-2">
                  {status.granted.map((scope) => (
                    <span key={scope} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                      {scope}
                    </span>
                  ))}
                  {status.granted.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">None detected.</span>
                  )}
                </div>
              </div>

              {status.missing.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-amber-700 mb-2">Missing Scopes (Required):</h3>
                  <div className="flex flex-wrap gap-2">
                    {status.missing.map((scope) => (
                      <span key={scope} className="px-2 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs font-bold">
                        {scope}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    To fix this, go to your Shopify Admin &gt; Settings &gt; Apps and sales channels &gt; Develop apps &gt; [Your App Name] &gt; Configuration and ensure these "Admin API access scopes" are checked.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {!status.ok && status.message && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <strong>Error Message:</strong> {status.message}
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
            </Button>
            <Button onClick={() => window.location.reload()}>
              Refresh Status
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
