import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';

interface FieldA11y {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/**
 * Moldura comum dos campos: rótulo sempre visível, erro ligado ao campo por
 * aria-describedby (o leitor de tela lê o erro junto com o campo) e
 * aria-invalid quando há erro. O campo em si vem pela função `children`.
 */
function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (a11y: FieldA11y) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-erro`;
  const hintId = `${id}-dica`;
  const describedBy = [error && errorId, hint && !error && hintId].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
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

const controlClass = (error?: string) =>
  cn(
    'mt-1.5 block w-full border bg-transparent px-3 py-2.5 focus:outline-none',
    error ? 'border-danger' : 'border-line focus:border-ink',
  );

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({
  label,
  error,
  hint,
  className,
  ...inputProps
}: ComponentProps<'input'> & FieldProps) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => <input {...a11y} className={controlClass(error)} {...inputProps} />}
    </Field>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  ...textareaProps
}: ComponentProps<'textarea'> & FieldProps) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => <textarea {...a11y} rows={5} className={controlClass(error)} {...textareaProps} />}
    </Field>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  children,
  ...selectProps
}: ComponentProps<'select'> & FieldProps) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(a11y) => (
        <select {...a11y} className={controlClass(error)} {...selectProps}>
          {children}
        </select>
      )}
    </Field>
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
