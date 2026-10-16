import { useId, useState } from 'react';
import { Link, useParams } from 'react-router';
import { FormMessage } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { AdminError, AdminLoading } from '@/features/admin/components/AdminState';
import { useAdminOrder, useUpdateOrderStatus } from '@/features/orders/api';
import {
  OrderItems,
  OrderTotalsList,
  StatusTimeline,
} from '@/features/orders/components/OrderContents';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { formatDateTime, formatTime, orderNumber } from '@/features/orders/format';
import {
  ADMIN_NEXT_STATUS,
  type AdminOrderDetail,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from '@/features/orders/types';
import { ApiError } from '@/lib/api';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  PROCESSING: 'Iniciar separação',
  SHIPPED: 'Marcar como enviado',
  DELIVERED: 'Marcar como entregue',
  CANCELLED: 'Cancelar pedido',
};

const HELP: Partial<Record<OrderStatus, string>> = {
  PENDING_PAYMENT:
    'Aguardando pagamento. "Pago" só é registrado pela confirmação do pagamento (Stripe, Fase 7), nunca pelo painel. Cancelar devolve as peças ao estoque.',
  PAID: 'Pagamento confirmado. Próximo passo: separar as peças.',
  PROCESSING: 'Em separação. Ao despachar, marque como enviado (use a observação para o rastreio).',
  SHIPPED: 'Enviado. Marque como entregue quando a entrega for confirmada.',
  DELIVERED: 'Pedido concluído.',
  CANCELLED: 'Pedido cancelado. As peças reservadas voltaram ao estoque.',
  EXPIRED: 'A reserva expirou sem pagamento. As peças voltaram ao estoque.',
};

function StatusActions({ order }: { order: AdminOrderDetail }) {
  const update = useUpdateOrderStatus(order.id);
  const [note, setNote] = useState('');
  const noteId = useId();
  const next = ADMIN_NEXT_STATUS[order.status] ?? [];

  return (
    <section aria-labelledby="situacao-pedido" className="border border-line p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="situacao-pedido" className="text-xl">
          Situação
        </h2>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-sm text-muted">{HELP[order.status]}</p>
      {order.status === 'PENDING_PAYMENT' && (
        <p className="mt-2 text-sm">Reserva até {formatTime(order.reservationExpiresAt)}.</p>
      )}

      {next.length > 0 && (
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor={noteId} className="text-sm font-medium">
              Observação (opcional)
            </label>
            <textarea
              id={noteId}
              rows={2}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex.: código de rastreio, motivo do cancelamento"
              className="mt-1.5 block w-full border border-line bg-transparent px-3 py-2 text-sm focus:border-ink focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {next.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === 'CANCELLED' ? 'secondary' : 'primary'}
                disabled={update.isPending}
                onClick={() =>
                  update.mutate(
                    { status, note: note.trim() || null },
                    { onSuccess: () => setNote('') },
                  )
                }
              >
                {ACTION_LABELS[status] ?? ORDER_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
        </div>
      )}
      {update.isError && (
        <div className="mt-4">
          <FormMessage>{update.error.message}</FormMessage>
        </div>
      )}
    </section>
  );
}

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const order = useAdminOrder(id);

  if (order.isPending) return <AdminLoading label="Carregando pedido…" />;
  if (order.isError) {
    if (order.error instanceof ApiError && [400, 404].includes(order.error.status))
      return <NotFoundPage />;
    return <AdminError error={order.error} onRetry={() => void order.refetch()} />;
  }
  const data = order.data;

  return (
    <div>
      <Link to="/admin/pedidos" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Pedidos
      </Link>
      <h1 className="mt-4 text-4xl sm:text-5xl">Pedido {orderNumber(data.number)}</h1>
      <p className="mt-2 text-sm text-muted">Feito em {formatDateTime(data.createdAt)}</p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 space-y-12 lg:order-1">
          <section aria-labelledby="itens-pedido">
            <h2 id="itens-pedido" className="text-2xl">
              Itens
            </h2>
            <div className="mt-4">
              <OrderItems order={data} />
            </div>
            <div className="mt-6 max-w-sm sm:ml-auto">
              <OrderTotalsList order={data} />
            </div>
          </section>
          <section aria-labelledby="historico-pedido">
            <h2 id="historico-pedido" className="text-2xl">
              Histórico
            </h2>
            <div className="mt-4">
              <StatusTimeline history={data.statusHistory} showActor />
            </div>
          </section>
        </div>
        <div className="order-1 space-y-6 lg:order-2">
          <StatusActions order={data} />
          <section aria-labelledby="cliente-pedido" className="border border-line p-5 text-sm">
            <h2 id="cliente-pedido" className="text-xl">
              Cliente
            </h2>
            <p className="mt-3">{data.user.name ?? 'Nome não informado'}</p>
            <p className="text-muted">{data.customerEmail}</p>
            <p className="mt-3 text-xs text-muted">
              Endereço de entrega: coletado pelo Stripe no pagamento (Fase 7).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
