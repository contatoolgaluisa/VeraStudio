import { useId, useState } from 'react';
import { NavLink, useParams, useSearchParams } from 'react-router';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { SearchForm } from '@/app/layout/SearchForm';
import { FilterPanel } from '@/features/catalog/components/FilterPanel';
import { Pagination } from '@/features/catalog/components/Pagination';
import { useCategories, useFilterOptions, useProducts } from '@/features/catalog/queries';
import type { ProductQuery, SortOption } from '@/features/catalog/types';
import {
  type CatalogUrlState,
  hasActiveFilters,
  readCatalogUrl,
  SORT_LABELS,
  toProductQuery,
  writeCatalogUrl,
} from '@/features/catalog/url-state';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';

const PAGE_SIZE = 12;

export type CatalogVariant = 'all' | 'category' | 'new' | 'sale' | 'search';

interface Heading {
  title: string;
  description?: string;
}

const FIXED_HEADINGS: Record<Exclude<CatalogVariant, 'category'>, Heading> = {
  all: { title: 'Loja', description: 'Todas as peças disponíveis.' },
  new: { title: 'Novidades', description: 'As peças que acabaram de chegar.' },
  sale: { title: 'Promoções', description: 'Peças selecionadas com preço reduzido.' },
  search: { title: 'Busca' },
};

/**
 * Página de listagem usada por /loja, /loja/:categoria, /novidades, /promocoes e /busca.
 * Muda só o filtro fixo de cada rota; filtros, ordenação e paginação são os mesmos.
 */
export function CatalogPage({ variant }: { variant: CatalogVariant }) {
  const { categoria } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortId = useId();

  const state = readCatalogUrl(searchParams);
  const categories = useCategories();
  const category =
    variant === 'category' ? categories.data?.find((c) => c.slug === categoria) : undefined;

  const baseQuery: ProductQuery = {
    ...(variant === 'category' ? { category: categoria } : {}),
    ...(variant === 'new' ? { isNew: true } : {}),
    ...(variant === 'sale' ? { onSale: true } : {}),
  };
  const products = useProducts({ ...toProductQuery(state, PAGE_SIZE), ...baseQuery });
  const filterOptions = useFilterOptions(variant === 'category' ? categoria : undefined);

  // Categoria inexistente na URL (ex.: /loja/sapatos) -> 404
  if (variant === 'category' && categories.isSuccess && !category) {
    return <NotFoundPage />;
  }

  const heading: Heading =
    variant === 'category'
      ? { title: category?.name ?? 'Carregando…', description: category?.description ?? undefined }
      : variant === 'search' && state.q
        ? { title: `Resultados para “${state.q}”` }
        : FIXED_HEADINGS[variant];

  /** Atualiza a URL. Qualquer mudança de filtro volta para a página 1. */
  function update(changes: Partial<CatalogUrlState>) {
    const next = { ...state, page: 1, ...changes };
    setSearchParams(writeCatalogUrl(next));
  }

  function changePage(page: number) {
    update({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearFilters() {
    update({ sizes: [], colors: [], minPrice: undefined, maxPrice: undefined });
  }

  const filters = <FilterPanel options={filterOptions.data} state={state} onChange={update} />;
  const total = products.data?.meta.total;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <header className="max-w-2xl">
        <h1 className="text-5xl sm:text-6xl">{heading.title}</h1>
        {heading.description && <p className="mt-3 text-muted">{heading.description}</p>}
        {variant === 'search' && <SearchForm key={state.q} className="mt-6 max-w-md" />}
      </header>

      {variant === 'all' || variant === 'category' ? (
        <CategoryLinks categories={categories.data ?? []} />
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-14">
        <aside aria-label="Filtros" className="hidden lg:block">
          {filters}
        </aside>

        <section aria-labelledby="resultado">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <p id="resultado" role="status" className="text-sm text-muted">
              {total === undefined
                ? 'Carregando produtos…'
                : pluralize(total, 'produto', 'produtos')}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                className="px-4 py-2 lg:hidden"
                onClick={() => setFiltersOpen(true)}
                aria-haspopup="dialog"
              >
                <Icon name="filter" />
                Filtrar
              </Button>
              <label htmlFor={sortId} className="sr-only">
                Ordenar por
              </label>
              <select
                id={sortId}
                value={state.sort}
                onChange={(event) => update({ sort: event.target.value as SortOption })}
                className="border border-line bg-transparent px-3 py-2 text-sm focus:border-ink"
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h2 className="sr-only">Produtos</h2>
          <Results
            products={products}
            filtered={hasActiveFilters(state)}
            onClearFilters={clearFilters}
          />

          {products.data && (
            <Pagination
              page={products.data.meta.page}
              totalPages={products.data.meta.totalPages}
              onPageChange={changePage}
            />
          )}
        </section>
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros" side="right">
        {filters}
        <div className="mt-10 flex gap-3 border-t border-line pt-6">
          <Button variant="secondary" className="flex-1" onClick={clearFilters}>
            Limpar
          </Button>
          <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
            {total === undefined
              ? 'Ver produtos'
              : `Ver ${pluralize(total, 'produto', 'produtos')}`}
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

function CategoryLinks({ categories }: { categories: { slug: string; name: string }[] }) {
  if (categories.length === 0) return null;
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'border px-4 py-2 text-sm transition-colors',
      isActive ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink',
    );

  return (
    <nav aria-label="Categorias" className="mt-8">
      <ul className="flex flex-wrap gap-2">
        <li>
          <NavLink to="/loja" end className={linkClass}>
            Tudo
          </NavLink>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <NavLink to={`/loja/${category.slug}`} className={linkClass}>
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Results({
  products,
  filtered,
  onClearFilters,
}: {
  products: ReturnType<typeof useProducts>;
  filtered: boolean;
  onClearFilters: () => void;
}) {
  if (products.isError) {
    return (
      <StatusMessage
        role="alert"
        title="Não foi possível carregar os produtos"
        action={
          <Button onClick={() => void products.refetch()} disabled={products.isFetching}>
            {products.isFetching ? 'Tentando…' : 'Tentar novamente'}
          </Button>
        }
      >
        {products.error.message} Verifique sua conexão e tente de novo.
      </StatusMessage>
    );
  }

  if (!products.data) return <ProductGridSkeleton />;

  if (products.data.data.length === 0) {
    return (
      <StatusMessage
        title="Nenhum produto encontrado"
        action={
          filtered ? (
            <Button variant="secondary" onClick={onClearFilters}>
              Limpar filtros
            </Button>
          ) : undefined
        }
      >
        {filtered
          ? 'Nenhuma peça combina com todos os filtros escolhidos. Remova algum filtro para ver mais opções.'
          : 'Tente buscar por outro nome ou navegue pelas categorias.'}
      </StatusMessage>
    );
  }

  return (
    <div className={cn('transition-opacity', products.isPlaceholderData && 'opacity-60')}>
      <ProductGrid products={products.data.data} priorityCount={4} />
    </div>
  );
}
