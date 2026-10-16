import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'text';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[2px] text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ink px-6 py-3 text-paper hover:bg-accent',
  secondary: 'border border-ink px-6 py-3 text-ink hover:bg-ink hover:text-paper',
  text: 'underline decoration-line underline-offset-4 hover:decoration-ink',
};

export function buttonClasses(variant: ButtonVariant = 'primary', className?: string) {
  return cn(base, variants[variant], className);
}
