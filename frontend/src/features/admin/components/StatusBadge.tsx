import { cn } from '@/lib/cn';
import { STATUS_LABELS, type ProductStatus } from '../types';

const tones: Record<ProductStatus, string> = {
  PUBLISHED: 'border-success text-success',
  DRAFT: 'border-line text-muted',
  ARCHIVED: 'border-line bg-paper-deep text-muted',
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={cn('inline-block border px-2 py-0.5 text-xs whitespace-nowrap', tones[status])}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
