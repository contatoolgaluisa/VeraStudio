import { Link } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { useDashboard } from '@/features/admin/api';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { cn } from '@/lib/cn';
import { formatPrice, pluralize } from '@/lib/format';

function Tile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="border border-line p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-2 font-serif text-4xl tabular-nums">{value}</dd>
      {note && <dd className="mt-1 text-xs text-muted">{note}</dd>}
    </div>
  );
}

/** Visão geral: tudo calculado na hora pela API a partir do banco. */
export function DashboardPage() {
  const dashboard = useDashboard();

  if (dashboard.isPending) return <AdminLoading label="Calculando indicadores…" />;
  if (dashboard.isError) {
    return <AdminError error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  }

  const { products, stock, lowStockItems, orders } = dashboard.data;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">Visão geral</h1>
        <ButtonLink to="/admin/produtos/novo" size="sm">
          Novo produto
        </ButtonLink>
      </div>

      <section aria-labelledby="produtos-titulo" className="mt-10">
        <h2 id="produtos-titulo" className="text-2xl">
          Produtos
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Cadastrados" value={products.total} />
          <Tile label="Publicados" value={products.published} note="Visíveis na loja" />
          <Tile label="Rascunhos" value={products.draft} />
          <Tile label="Arquivados" value={products.archived} />
        </dl>
      </section>

      <section aria-labelledby="pedidos-titulo" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="pedidos-titulo" className="text-2xl">
            Pedidos e receita
          </h2>
          <Link
            to="/admin/pedidos"
            className="text-sm underline underline-offset-4 hover:text-accent"
          >
            Ver pedidos
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Pedidos recebidos" value={orders.total} />
          <Tile label="Aguardando pagamento" value={orders.pendingPayment} />
          <Tile label="Para separar e enviar" value={orders.toFulfill} />
          <div className="border border-line p-5">
            <dt className="text-sm text-muted">Receita de pedidos pagos</dt>
            <dd className="mt-2 font-serif text-3xl tabular-nums">
              {formatPrice(orders.paidRevenueCents)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          A receita soma só pedidos com pagamento confirmado. A confirmação vem do Stripe (Fase 7):
          até lá, ela fica em R$ 0,00.
        </p>
      </section>

      <section aria-labelledby="estoque-titulo" className="mt-12">
        <h2 id="estoque-titulo" className="text-2xl">
          Estoque baixo
        </h2>
        <p className="mt-2 text-sm text-muted">
          Variações ativas com {stock.threshold} unidades ou menos, em produtos publicados ou em
          rascunho: {pluralize(stock.lowStock, 'variação', 'variações')}, sendo{' '}
          {pluralize(stock.outOfStock, 'esgotada', 'esgotadas')}.
        </p>

        {lowStockItems.length === 0 ? (
          <p className="mt-4 text-sm">Nenhuma variação com estoque baixo no momento.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Produto
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Variação
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    SKU
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Estoque
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.sku} className="border-b border-line">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/admin/produtos/${item.product.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {item.product.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      {item.color} · {item.size}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{item.sku}</td>
                    <td
                      className={cn(
                        'py-3 text-right tabular-nums',
                        item.stock === 0 && 'text-danger',
                      )}
                    >
                      {item.stock === 0 ? 'Esgotado' : item.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
