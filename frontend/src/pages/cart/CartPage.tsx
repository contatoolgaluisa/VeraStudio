import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Price } from '@/components/product/Price';
import { Button, ButtonLink } from '@/components/ui/Button';
import { SlowStartNotice } from '@/components/ui/SlowStartNotice';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { type CartQuote, type QuoteLine, useCartQuote } from '@/features/cart/api';
import { cart, type CartItem, MAX_QUANTITY_PER_ITEM, useCartItems } from '@/features/cart/store';
import { cn } from '@/lib/cn';
import { formatPrice, pluralize } from '@/lib/format';
import { imageUrl } from '@/lib/images';

export function CartPage() {
  const items = useCartItems();
  const quote = useCartQuote(items);
  const adjustments = useApplyAdjustments(quote.data);

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <StatusMessage
          title="Seu carrinho está vazio"
          action={<ButtonLink to="/loja">Ver a loja</ButtonLink>}
        >
          Escolha cor e tamanho na página de um produto para adicioná-lo aqui.
        </StatusMessage>
      </section>
    );
  }

  const lines = new Map(quote.data?.items.map((line) => [line.variantId, line]));
  const unavailable = quote.data?.items.filter((line) => line.status === 'UNAVAILABLE') ?? [];
  const canCheckout =
    Boolean(quote.data) &&
    !quote.isFetching &&
    quote.data!.items.every((line) => line.status === 'OK');

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-4xl sm:text-5xl">Carrinho</h1>

      {adjustments.length > 0 && (
        <div role="status" className="mt-6 border-l-2 border-accent bg-accent/5 px-4 py-3 text-sm">
          <p className="font-medium">Ajustamos o carrinho ao estoque disponível:</p>
          <ul className="mt-1 list-disc pl-5">
            {adjustments.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          {quote.isPending && <SlowStartNotice />}
          <ul className="border-t border-line">
            {items.map((item) => (
              <CartLine key={item.variantId} item={item} line={lines.get(item.variantId)} />
            ))}
          </ul>
        </div>

        <aside aria-labelledby="resumo-titulo" className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-line p-6">
            <h2 id="resumo-titulo" className="text-2xl">
              Resumo
            </h2>
            {quote.isError ? (
              <div role="alert" className="mt-4 text-sm">
                <p>Não foi possível conferir preços e estoque agora.</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => void quote.refetch()}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : quote.data ? (
              <Summary quote={quote.data} />
            ) : (
              <p role="status" className="mt-4 text-sm text-muted">
                Conferindo preços e estoque…
              </p>
            )}

            {unavailable.length > 0 && (
              <p className="mt-4 text-sm text-danger">
                Remova os itens indisponíveis para continuar.
              </p>
            )}
            {canCheckout ? (
              <ButtonLink to="/checkout" className="mt-6 w-full">
                Finalizar compra
              </ButtonLink>
            ) : (
              <Button className="mt-6 w-full" disabled>
                Finalizar compra
              </Button>
            )}
            <p className="mt-2 text-xs text-muted">
              É preciso entrar na sua conta para finalizar a compra.
            </p>
          </div>
          <Link
            to="/loja"
            className="mt-4 inline-block text-sm underline underline-offset-4 hover:text-accent"
          >
            Continuar comprando
          </Link>
        </aside>
      </div>
    </section>
  );
}

/**
 * Quando o servidor reduz uma quantidade (estoque menor que o pedido),
 * aplica a quantidade nova no carrinho salvo e guarda um aviso para a tela.
 */
function useApplyAdjustments(quote: CartQuote | undefined) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const adjusted = quote?.items.filter((line) => line.status === 'ADJUSTED') ?? [];
    if (adjusted.length === 0) return;
    for (const line of adjusted) {
      cart.setQuantity(line.variantId, line.quantity, line.maxQuantity);
    }
    setMessages((previous) => [
      ...previous,
      ...adjusted.map(
        (line) =>
          `${line.product?.name ?? 'Item'} (${line.variant?.color}, ${line.variant?.size}): ` +
          `${pluralize(line.quantity, 'unidade disponível', 'unidades disponíveis')}.`,
      ),
    ]);
  }, [quote]);

  return messages;
}

function CartLine({ item, line }: { item: CartItem; line: QuoteLine | undefined }) {
  const unavailable = line?.status === 'UNAVAILABLE';
  const name = line?.product?.name ?? item.display.productName;
  const slug = line?.product?.slug ?? item.display.productSlug;
  const color = line?.variant?.color ?? item.display.color;
  const size = line?.variant?.size ?? item.display.size;
  const image = line?.product?.image?.url ?? item.display.imageUrl;
  const max = line && !unavailable ? line.maxQuantity : MAX_QUANTITY_PER_ITEM;
  const label = `${name}, ${color}, ${size}`;

  return (
    <li className="flex gap-4 border-b border-line py-6 sm:gap-6">
      <Link
        to={`/produto/${slug}?cor=${encodeURIComponent(color)}`}
        className="w-20 shrink-0 sm:w-28"
      >
        <div className="aspect-[3/4] overflow-hidden bg-paper-deep">
          {image && (
            <img
              src={imageUrl(image, 320)}
              alt=""
              loading="lazy"
              className={cn('h-full w-full object-cover', unavailable && 'opacity-50')}
            />
          )}
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="min-w-0">
          <Link
            to={`/produto/${slug}?cor=${encodeURIComponent(color)}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {name}
          </Link>
          <p className="mt-1 text-sm text-muted">
            {color} · Tamanho {size}
          </p>
          {line?.unitPriceCents != null ? (
            <Price
              priceCents={line.unitPriceCents}
              compareAtPriceCents={line.compareAtPriceCents}
              className="mt-2 text-sm"
            />
          ) : (
            !line && (
              <p className="mt-2 text-sm text-muted tabular-nums">
                {formatPrice(item.display.unitPriceCents)}
              </p>
            )
          )}
          {unavailable && (
            <p className="mt-2 text-sm text-danger">
              Indisponível: esgotado ou fora da loja. Remova para continuar.
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
          {!unavailable && (
            <div
              className="flex items-center border border-line"
              role="group"
              aria-label={`Quantidade de ${label}`}
            >
              <button
                type="button"
                className="size-9 disabled:opacity-40"
                aria-label={`Diminuir quantidade de ${label}`}
                disabled={item.quantity <= 1}
                onClick={() => cart.setQuantity(item.variantId, item.quantity - 1, max)}
              >
                −
              </button>
              <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                {item.quantity}
              </span>
              <button
                type="button"
                className="size-9 disabled:opacity-40"
                aria-label={`Aumentar quantidade de ${label}`}
                disabled={item.quantity >= max}
                onClick={() => cart.setQuantity(item.variantId, item.quantity + 1, max)}
              >
                +
              </button>
            </div>
          )}
          {line && !unavailable && (
            <p className="text-sm tabular-nums">{formatPrice(line.lineTotalCents)}</p>
          )}
          <Button
            size="sm"
            variant="text"
            aria-label={`Remover ${label}`}
            onClick={() => cart.remove(item.variantId)}
          >
            Remover
          </Button>
        </div>
      </div>
    </li>
  );
}

function Summary({ quote }: { quote: CartQuote }) {
  const { summary } = quote;
  return (
    <>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal ({pluralize(summary.itemCount, 'item', 'itens')})</dt>
          <dd className="tabular-nums">{formatPrice(summary.subtotalCents)}</dd>
        </div>
        {summary.discountCents > 0 && (
          <div className="flex justify-between text-accent">
            <dt>Descontos</dt>
            <dd className="tabular-nums">−{formatPrice(summary.discountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Frete</dt>
          <dd className="tabular-nums">
            {summary.shippingCents === 0 && summary.itemCount > 0
              ? 'Grátis'
              : formatPrice(summary.shippingCents)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPrice(summary.totalCents)}</dd>
        </div>
      </dl>
      {summary.freeShippingRemainingCents > 0 && summary.itemCount > 0 && (
        <p className="mt-4 text-xs text-muted">
          Faltam {formatPrice(summary.freeShippingRemainingCents)} para frete grátis (compras a
          partir de {formatPrice(summary.freeShippingMinCents)}).
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Frete fixo para todo o Brasil, regra demonstrativa do projeto.
      </p>
    </>
  );
}
