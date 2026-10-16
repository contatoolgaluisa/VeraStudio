import { type FormEvent, useId } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { Pagination } from '@/features/catalog/components/Pagination';
import { useAdminOrders } from '@/features/orders/api';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { formatDateTime, orderNumber } from '@/features/orders/format';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/features/orders/types';
import { formatPrice, pluralize } from '@/lib/format';

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = STATUSES.find((value) => value === params.get('status'));
  const page = Math.max(1, Number(params.get('pagina')) || 1);
  const orders = useAdminOrders({ q: q || undefined, status, page });
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
      <h1 className="text-4xl sm:text-5xl">Pedidos</h1>

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <form
          role="search"
          aria-label="Pedidos do painel"
          onSubmit={onSearch}
          className="flex min-w-0 flex-1 items-end gap-2"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor={searchId} className="text-sm font-medium">
              Buscar por número ou e-mail
            </label>
            <input
              id={searchId}
              key={q}
              name="q"
              type="search"
              defaultValue={q}
              placeholder="#1001 ou cliente@exemplo.com"
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
                {ORDER_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {orders.isPending ? (
        <AdminLoading label="Carregando pedidos…" />
      ) : orders.isError ? (
        <AdminError error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.data.data.length === 0 ? (
        <StatusMessage title="Nenhum pedido encontrado">
          {q || status
            ? 'Nenhum pedido corresponde à busca ou ao filtro.'
            : 'Os pedidos aparecem aqui assim que clientes finalizarem compras na loja.'}
        </StatusMessage>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted" aria-live="polite">
            {pluralize(orders.data.meta.total, 'pedido', 'pedidos')}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Pedido
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Cliente
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    Situação
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-normal">
                    Itens
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.data.data.map((order) => (
                  <tr key={order.id} className="border-b border-line">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/admin/pedidos/${order.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {orderNumber(order.number)}
                      </Link>
                      <p className="text-xs text-muted">{formatDateTime(order.createdAt)}</p>
                    </td>
                    <td className="py-3 pr-4">{order.customerEmail}</td>
                    <td className="py-3 pr-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{order.itemCount}</td>
                    <td className="py-3 text-right tabular-nums">
                      {formatPrice(order.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={orders.data.meta.page}
            totalPages={orders.data.meta.totalPages}
            onPageChange={(next) => update({ pagina: String(next) })}
          />
        </>
      )}
    </div>
  );
}
