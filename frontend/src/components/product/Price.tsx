import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';

/** Preço atual e, em promoção, o preço anterior riscado. */
export function Price({
  priceCents,
  compareAtPriceCents,
  className,
}: {
  priceCents: number;
  compareAtPriceCents: number | null;
  className?: string;
}) {
  const onSale = compareAtPriceCents !== null && compareAtPriceCents > priceCents;

  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2 tabular-nums', className)}>
      {onSale && (
        <s className="text-muted">
          <span className="sr-only">De </span>
          {formatPrice(compareAtPriceCents)}
        </s>
      )}
      <span className={onSale ? 'text-accent' : undefined}>
        {onSale && <span className="sr-only">por </span>}
        {formatPrice(priceCents)}
      </span>
    </p>
  );
}
