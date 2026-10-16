import { type FormEvent, useId } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useAdminProducts } from '@/features/admin/api';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { Thumb } from '@/features/admin/components/Thumb';
import { type ProductStatus, STATUS_LABELS } from '@/features/admin/types';
import { Pagination } from '@/features/catalog/components/Pagination';
import { formatPrice, pluralize } from '@/lib/format';

const STATUSES = Object.keys(STATUS_LABELS) as ProductStatus[];

function readStatus(value: string | null): ProductStatus | undefined {
  return STATUSES.find((status) => status === value);
}

/** Lista de produtos do painel. Busca e filtro ficam na URL (dá para voltar e compartilhar). */
export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = readStatus(params.get('status'));
  const page = Math.max(1, Number(params.get('pagina')) || 1);
  const products = useAdminProducts({ q: q || undefined, status, page });
  const searchId = useId();
  const statusId = useId();

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('pagina' in changes)) next.delete('pagina');
    setParams(next);
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('q');
    update({ q: typeof value === 'string' ? value.trim() : undefined });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">Produtos</h1>
        <ButtonLink to="/admin/produtos/novo" size="sm">
          Novo produto
        </ButtonLink>
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <form
          role="search"
          aria-label="Produtos do painel"
          onSubmit={onSearch}
          className="flex min-w-0 flex-1 items-end gap-2"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor={searchId} className="text-sm font-medium">
              Buscar por nome ou SKU
            </label>
            <input
              id={searchId}
              key={q}
              name="q"
              type="search"
              defaultValue={q}
              className="mt-1.5 block w-full border border-line bg-transparent px-3 py-2.5 focus:border-ink focus:outline-none"
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
        <div>
          <label htmlFor={statusId} className="text-sm font-medium">
            Situação
          </label>
          <select
            id={statusId}
            value={status ?? ''}
            onChange={(event) => update({ status: event.target.value || undefined })}
            className="mt-1.5 block border border-line bg-transparent px-3 py-2.5 focus:border-ink focus:outline-none"
          >
            <option value="">Todas</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products.isPending ? (
        <AdminLoading label="Carregando produtos…" />
      ) : products.isError ? (
        <AdminError error={products.error} onRetry={() => void products.refetch()} />
      ) : products.data.data.length === 0 ? (
        <StatusMessage title="Nenhum produto encontrado">
          {q || status
            ? 'Nenhum produto corresponde à busca ou ao filtro. Tente outros termos.'
            : 'Cadastre o primeiro produto para começar.'}
        </StatusMessage>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted" aria-live="polite">
            {pluralize(products.data.meta.total, 'produto', 'produtos')}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Produto
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Situação
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">
                    Preço
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">
                    Variações
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Estoque
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.data.data.map((product) => (
                  <tr key={product.id} className="border-b border-line">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Thumb url={product.image?.url ?? null} />
                        <div className="min-w-0">
                          <Link
                            to={`/admin/produtos/${product.id}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-muted">{product.category.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatPrice(product.priceCents)}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{product.variantCount}</td>
                    <td className="py-3 text-right tabular-nums">{product.totalStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={products.data.meta.page}
            totalPages={products.data.meta.totalPages}
            onPageChange={(next) => update({ pagina: String(next) })}
          />
        </>
      )}
    </div>
  );
}
