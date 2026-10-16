import { useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { FormMessage } from '@/components/form/TextField';
import { Button, ButtonLink } from '@/components/ui/Button';
import { SlowStartNotice } from '@/components/ui/SlowStartNotice';
import { useCartQuote } from '@/features/cart/api';
import { cart, useCartItems } from '@/features/cart/store';
import { useCreateOrder } from '@/features/orders/api';
import { ApiError } from '@/lib/api';
import { formatPrice, pluralize } from '@/lib/format';

/**
 * Revisão final antes de criar o pedido. Ao confirmar, o servidor confere
 * tudo de novo, cria o pedido e reserva as peças por 30 minutos.
 * O pagamento (Stripe em modo de teste) chega na Fase 7.
 */
export function CheckoutPage() {
  const items = useCartItems();
  const quote = useCartQuote(items);
  const createOrder = useCreateOrder();
  const navigate = useNavigate();

  const payload = items.map(({ variantId, quantity }) => ({ variantId, quantity }));
  // Uma chave por versão do carrinho: o mesmo pedido enviado duas vezes
  // (clique duplo, nova tentativa após erro de rede) vira um pedido só.
  // Se o carrinho mudar, é outra compra e ganha outra chave.
  const attempt = useRef<{ payload: string; key: string } | null>(null);

  if (items.length === 0 && createOrder.isIdle) return <Navigate to="/carrinho" replace />;

  const lines = quote.data?.items ?? [];
  const blocked = lines.some((line) => line.status !== 'OK');
  const cartChanged =
    createOrder.error instanceof ApiError && createOrder.error.code === 'CART_CHANGED';

  function confirm() {
    const payloadKey = JSON.stringify(payload);
    if (attempt.current?.payload !== payloadKey) {
      attempt.current = { payload: payloadKey, key: crypto.randomUUID() };
    }
    createOrder.mutate(
      { items: payload, idempotencyKey: attempt.current.key },
      {
        onSuccess: async (order) => {
          // Primeiro sai do checkout, depois esvazia o carrinho: ao contrário,
          // esta página veria o carrinho vazio e voltaria para /carrinho.
          await navigate(`/conta/pedidos/${order.id}?novo=1`, { replace: true });
          cart.clear();
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'CART_CHANGED') void quote.refetch();
        },
      },
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link to="/carrinho" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Voltar ao carrinho
      </Link>
      <h1 className="mt-4 text-4xl sm:text-5xl">Finalizar compra</h1>

      {quote.isPending && (
        <div className="mt-8">
          <SlowStartNotice />
        </div>
      )}
      {quote.isError && (
        <div className="mt-8">
          <FormMessage>Não foi possível conferir o carrinho agora. Tente novamente.</FormMessage>
        </div>
      )}

      {quote.data && (
        <>
          <ul className="mt-8 border-t border-line">
            {lines.map((line) => (
              <li
                key={line.variantId}
                className="flex justify-between gap-4 border-b border-line py-4 text-sm"
              >
                <span>
                  <span className="font-medium">{line.product?.name ?? 'Item indisponível'}</span>
                  {line.variant && (
                    <span className="text-muted">
                      {' '}
                      · {line.variant.color} · {line.variant.size} · {line.quantity}×
                    </span>
                  )}
                  {line.status !== 'OK' && (
                    <span className="block text-danger">
                      {line.status === 'UNAVAILABLE' ? 'Indisponível' : 'Quantidade mudou'}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">{formatPrice(line.lineTotalCents)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Produtos ({pluralize(quote.data.summary.itemCount, 'item', 'itens')})</dt>
              <dd className="tabular-nums">
                {formatPrice(quote.data.summary.subtotalCents - quote.data.summary.discountCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Frete</dt>
              <dd className="tabular-nums">
                {quote.data.summary.shippingCents === 0
                  ? 'Grátis'
                  : formatPrice(quote.data.summary.shippingCents)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(quote.data.summary.totalCents)}</dd>
            </div>
          </dl>

          <div className="mt-8 space-y-3 border border-line p-5 text-sm">
            <p>
              <strong className="font-medium">
                Ao confirmar, as peças ficam reservadas por 30 minutos.
              </strong>{' '}
              Se o pagamento não for concluído nesse prazo, o pedido expira e as peças voltam para a
              loja.
            </p>
            <p className="text-muted">
              Pagamento e endereço de entrega: o checkout com Stripe (modo de teste, sem cobrança
              real) chega na Fase 7 do projeto. Até lá, o pedido fica como "aguardando pagamento" e
              pode ser cancelado em "Meus pedidos".
            </p>
          </div>

          {(blocked || cartChanged) && (
            <div className="mt-6">
              <FormMessage>
                Alguns itens mudaram de preço ou disponibilidade. Revise o carrinho antes de
                confirmar.{' '}
                <Link to="/carrinho" className="underline underline-offset-4">
                  Ir para o carrinho
                </Link>
              </FormMessage>
            </div>
          )}
          {createOrder.isError && !cartChanged && (
            <div className="mt-6">
              <FormMessage>{createOrder.error.message}</FormMessage>
            </div>
          )}

          <Button
            className="mt-8 w-full sm:w-auto"
            disabled={blocked || createOrder.isPending || quote.isFetching}
            onClick={confirm}
          >
            {createOrder.isPending ? 'Criando pedido…' : 'Confirmar pedido'}
          </Button>
        </>
      )}

      {!quote.data && !quote.isPending && (
        <ButtonLink to="/carrinho" variant="secondary" className="mt-8">
          Voltar ao carrinho
        </ButtonLink>
      )}
    </section>
  );
}
