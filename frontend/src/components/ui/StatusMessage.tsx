import type { ReactNode } from 'react';

/**
 * Mensagem para estados vazios e de erro. Diz o que aconteceu e o que fazer,
 * sem pedir desculpas e sem frases vagas.
 */
export function StatusMessage({
  title,
  children,
  action,
  role,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  role?: 'alert' | 'status';
}) {
  return (
    <div role={role} className="max-w-md py-16">
      <h2 className="text-3xl">{title}</h2>
      {children && <div className="mt-3 text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
