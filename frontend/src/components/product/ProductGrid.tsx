import type { ProductSummary } from '@/features/catalog/types';
import { ProductCard } from './ProductCard';

const gridClasses = 'grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6';

export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: ProductSummary[];
  /** Quantos primeiros cards carregam a imagem sem esperar a rolagem. */
  priorityCount?: number;
}) {
  return (
    <ul className={gridClasses}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

/** Esqueleto exibido enquanto os produtos carregam (mesmo formato da grade real). */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={gridClasses} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="animate-pulse">
          <div className="aspect-[3/4] bg-paper-deep" />
          <div className="mt-3 h-4 w-3/4 bg-paper-deep" />
          <div className="mt-2 h-4 w-1/3 bg-paper-deep" />
        </li>
      ))}
    </ul>
  );
}
