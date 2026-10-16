import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { pageWindow } from '../pagination';

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const arrowClass =
    'flex size-10 items-center justify-center border border-line hover:border-ink disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav aria-label="Paginação" className="mt-16 flex items-center justify-center gap-2">
      <button
        type="button"
        className={arrowClass}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <Icon name="chevronLeft" />
        <span className="sr-only">Página anterior</span>
      </button>

      <ul className="flex items-center gap-1">
        {pageWindow(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'size-10 text-sm tabular-nums',
                  item === page ? 'bg-ink text-paper' : 'hover:bg-paper-deep',
                )}
              >
                <span className="sr-only">Página </span>
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        className={arrowClass}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <Icon name="chevronRight" />
        <span className="sr-only">Próxima página</span>
      </button>
    </nav>
  );
}
