import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { FormMessage } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useCancelMyOrder, useMyOrder } from '@/features/orders/api';
import {
  OrderItems,
  OrderTotalsList,
  StatusTimeline,
} from '@/features/orders/components/OrderContents';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { formatDateTime, formatTime, orderNumber } from '@/features/orders/format';
import { ApiError } from '@/lib/api';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';

export function OrderPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const order = useMyOrder(id);
  const cancel = useCancelMyOrder(id);
  const [confirming, setConfirming] = useState(false);

  if (order.isPending) {
    return (
      <p role="status" className="mx-auto max-w-3xl px-4 py-24 text-muted sm:px-6">
        Carregando pedido…
      </p>
    );
  }
  if (order.isError) {
    if (order.error instanceof ApiError && [400, 404].includes(order.error.status))
      return <NotFoundPage />;
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <StatusMessage
          role="alert"
          title="Não foi possível carregar o pedido"
          action={<Button onClick={() => void order.refetch()}>Tentar novamente</Button>}
        >
          {order.error.message}
        </StatusMessage>
      </div>
    );
  }

  const data = cancel.data ?? order.data;
  const pending = data.status === 'PENDING_PAYMENT';

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link to="/conta/pedidos" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Meus pedidos
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <h1 className="text-4xl sm:text-5xl">Pedido {orderNumber(data.number)}</h1>
        <OrderStatusBadge status={data.status} />
      </div>
      <p className="mt-2 text-sm text-muted">Feito em {formatDateTime(data.createdAt)}</p>

      {params.get('novo') && pending && (
        <div className="mt-8">
          <FormMessage tone="success">
            Pedido criado. As peças estão reservadas para você.
          </FormMessage>
        </div>
      )}

      {pending && (
        <div className="mt-8 space-y-3 border border-accent/40 p-5 text-sm">
          <p>
            <strong className="font-medium">
              Reservado até {formatTime(data.reservationExpiresAt)}.
            </strong>{' '}
            Depois disso, sem pagamento, o pedido expira e as peças voltam para a loja.
          </p>
          <p className="text-muted">
            O pagamento com Stripe (modo de teste, sem cobrança real) chega na Fase 7 do projeto.
          </p>
          {confirming ? (
            <div className="flex flex-wrap gap-3">
              <Button size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                Confirmar cancelamento
              </Button>
              <Button size="sm" variant="text" onClick={() => setConfirming(false)}>
                Manter pedido
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
              Cancelar pedido
            </Button>
          )}
          {cancel.isError && <FormMessage>{cancel.error.message}</FormMessage>}
        </div>
      )}
      {data.status === 'EXPIRED' && (
        <p className="mt-8 border border-line p-5 text-sm">
          A reserva expirou sem pagamento e as peças voltaram para a loja. Se ainda quiser os itens,
          adicione-os ao carrinho novamente.
        </p>
      )}

      <div className="mt-10">
        <h2 className="text-2xl">Itens</h2>
        <div className="mt-4">
          <OrderItems order={data} />
        </div>
        <div className="mt-6 max-w-sm sm:ml-auto">
          <OrderTotalsList order={data} />
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl">Andamento</h2>
        <div className="mt-4">
          <StatusTimeline history={data.statusHistory} />
        </div>
      </div>
    </section>
  );
}
