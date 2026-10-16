import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Campo de formulário acessível: rótulo sempre visível, erro ligado ao campo
 * por aria-describedby (o leitor de tela lê o erro junto com o campo) e
 * aria-invalid quando há erro.
 */
export function TextField({
  label,
  error,
  hint,
  className,
  ...inputProps
}: ComponentProps<'input'> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  const errorId = `${id}-erro`;
  const hintId = `${id}-dica`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'mt-1.5 block w-full border bg-transparent px-3 py-2.5 focus:outline-none',
          error ? 'border-danger' : 'border-line focus:border-ink',
        )}
        {...inputProps}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Mensagem de erro ou sucesso do formulário inteiro (ex.: "E-mail ou senha incorretos."). */
export function FormMessage({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success';
  children: ReactNode;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'border-l-2 px-4 py-3 text-sm',
        tone === 'error' ? 'border-danger bg-danger/5' : 'border-success bg-success/5',
      )}
    >
      {children}
    </p>
  );
}
