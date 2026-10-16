import { Link } from 'react-router';
import { Price } from '@/components/product/Price';
import { formatPrice, pluralize } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { formatDateTime } from '../format';
import { ORDER_STATUS_LABELS, type OrderDetail, type StatusChange } from '../types';

/** Itens do pedido, como foram comprados (dados congelados na criação). */
export function OrderItems({
  order,
  linkToProducts = true,
}: {
  order: OrderDetail;
  linkToProducts?: boolean;
}) {
  return (
    <ul className="border-t border-line">
      {order.items.map((item) => (
        <li key={item.id} className="flex gap-4 border-b border-line py-4">
          <div className="aspect-[3/4] w-16 shrink-0 overflow-hidden bg-paper-deep">
            {item.imageUrl && (
              <img
                src={imageUrl(item.imageUrl, 160)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-6 gap-y-1">
            <div className="min-w-0">
              {linkToProducts ? (
                <Link
                  to={`/produto/${item.productSlug}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {item.productName}
                </Link>
              ) : (
                <p className="font-medium">{item.productName}</p>
              )}
              <p className="mt-1 text-sm text-muted">
                {item.color} · Tamanho {item.size} · {item.sku}
              </p>
              <Price
                priceCents={item.unitPriceCents}
                compareAtPriceCents={item.compareAtPriceCents}
                className="mt-1 text-sm"
              />
            </div>
            <div className="text-right text-sm tabular-nums">
              <p>{pluralize(item.quantity, 'unidade', 'unidades')}</p>
              <p className="mt-1 font-medium">{formatPrice(item.lineTotalCents)}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotalsList({ order }: { order: OrderDetail }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt>Subtotal ({pluralize(order.itemCount, 'item', 'itens')})</dt>
        <dd className="tabular-nums">{formatPrice(order.subtotalCents)}</dd>
      </div>
      {order.discountCents > 0 && (
        <div className="flex justify-between text-accent">
          <dt>Descontos</dt>
          <dd className="tabular-nums">−{formatPrice(order.discountCents)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt>Frete</dt>
        <dd className="tabular-nums">
          {order.shippingCents === 0 ? 'Grátis' : formatPrice(order.shippingCents)}
        </dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPrice(order.totalCents)}</dd>
      </div>
    </dl>
  );
}

/** Linha do tempo das mudanças de situação. No painel, mostra quem mudou e a observação. */
export function StatusTimeline({
  history,
  showActor = false,
}: {
  history: StatusChange[];
  showActor?: boolean;
}) {
  return (
    <ol className="space-y-4 border-l border-line pl-5">
      {history.map((change, index) => (
        <li key={change.id ?? index} className="relative">
          <span
            aria-hidden="true"
            className="absolute top-1.5 -left-[1.4rem] size-2 rounded-full bg-ink"
          />
          <p className="text-sm font-medium">{ORDER_STATUS_LABELS[change.toStatus]}</p>
          <p className="text-xs text-muted">
            {formatDateTime(change.createdAt)}
            {showActor &&
              ` · ${change.changedBy ? `${change.changedBy.email}${change.changedBy.role === 'ADMIN' ? ' (administração)' : ' (cliente)'}` : 'sistema'}`}
          </p>
          {showActor && change.note && <p className="mt-1 text-sm">{change.note}</p>}
        </li>
      ))}
    </ol>
  );
}
