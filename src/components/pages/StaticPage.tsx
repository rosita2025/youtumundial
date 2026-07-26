import { ReactNode } from 'react';
import { Layout } from '@/components/layout/Layout';

interface StaticPageProps {
  title: string;
  intro?: string;
  updatedAt?: string;
  children: ReactNode;
}

/** Plantilla compartida para páginas institucionales y legales. */
export function StaticPage({ title, intro, updatedAt, children }: StaticPageProps) {
  return (
    <Layout>
      <div className="container-wide py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading text-4xl md:text-5xl font-semibold">{title}</h1>
          {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}
          {updatedAt && (
            <p className="mt-2 text-sm text-muted-foreground">Última actualización: {updatedAt}</p>
          )}
          <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">{children}</div>
        </div>
      </div>
    </Layout>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
