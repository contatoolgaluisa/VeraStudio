import { Link, useSearchParams } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Pagination } from '@/features/catalog/components/Pagination';
import { useMyOrders } from '@/features/orders/api';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { formatDateTime, orderNumber } from '@/features/orders/format';
import { formatPrice, pluralize } from '@/lib/format';

export function MyOrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('pagina')) || 1);
  const orders = useMyOrders(page);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link to="/conta" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Minha conta
      </Link>
      <h1 className="mt-4 text-4xl sm:text-5xl">Meus pedidos</h1>

      {orders.isPending ? (
        <p role="status" className="py-16 text-muted">
          Carregando seus pedidos…
        </p>
      ) : orders.isError ? (
        <StatusMessage
          role="alert"
          title="Não foi possível carregar seus pedidos"
          action={<Button onClick={() => void orders.refetch()}>Tentar novamente</Button>}
        >
          {orders.error.message}
        </StatusMessage>
      ) : orders.data.data.length === 0 ? (
        <StatusMessage
          title="Você ainda não fez pedidos"
          action={<ButtonLink to="/loja">Ver a loja</ButtonLink>}
        />
      ) : (
        <>
          <ul className="mt-10 border-t border-line">
            {orders.data.data.map((order) => (
              <li key={order.id} className="border-b border-line">
                <Link
                  to={`/conta/pedidos/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-paper-deep/50"
                >
                  <span>
                    <span className="font-medium">Pedido {orderNumber(order.number)}</span>
                    <span className="block text-sm text-muted">
                      {formatDateTime(order.createdAt)} ·{' '}
                      {pluralize(order.itemCount, 'item', 'itens')}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <OrderStatusBadge status={order.status} />
                    <span className="tabular-nums">{formatPrice(order.totalCents)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={orders.data.meta.page}
            totalPages={orders.data.meta.totalPages}
            onPageChange={(next) => setParams({ pagina: String(next) })}
          />
        </>
      )}
    </section>
  );
}
