import { cn } from '@/lib/cn';
import { ORDER_STATUS_LABELS, type OrderStatus } from '../types';

const tones: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'border-accent text-accent',
  PAID: 'border-success text-success',
  PROCESSING: 'border-success text-success',
  SHIPPED: 'border-success text-success',
  DELIVERED: 'border-ink text-ink',
  CANCELLED: 'border-line bg-paper-deep text-muted',
  EXPIRED: 'border-line bg-paper-deep text-muted',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn('inline-block border px-2 py-0.5 text-xs whitespace-nowrap', tones[status])}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
