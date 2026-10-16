import type { ReactNode } from 'react';

/** Moldura comum das telas de login, cadastro e senha: estreita e centrada no conteúdo. */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      {description && <p className="mt-3 text-muted">{description}</p>}
      <div className="mt-10">{children}</div>
      {footer && <div className="mt-8 space-y-2 text-sm text-muted">{footer}</div>}
    </section>
  );
}
