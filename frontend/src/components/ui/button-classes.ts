import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'text';
export type ButtonSize = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[2px] text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:bg-accent',
  secondary: 'border border-ink text-ink hover:bg-ink hover:text-paper',
  text: 'underline decoration-line underline-offset-4 hover:decoration-ink',
};

// O espaçamento interno fica separado da variante: assim um botão menor não
// precisa sobrescrever classes (no Tailwind, duas classes de padding
// conflitantes não têm um vencedor previsível).
const sizes: Record<ButtonSize, string> = {
  md: 'px-6 py-3',
  sm: 'px-3 py-2',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(base, variants[variant], variant !== 'text' && sizes[size], className);
}
