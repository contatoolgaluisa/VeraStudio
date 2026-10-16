import { OrderStatus } from '../../generated/prisma/client.js';

/** Tempo que o estoque fica reservado esperando o pagamento (decisão D6). */
export const RESERVATION_MINUTES = 30;

/** Pedidos aguardando pagamento ao mesmo tempo, por cliente (evita "segurar" estoque). */
export const MAX_PENDING_ORDERS_PER_USER = 3;

/** Situações em que o pagamento já foi confirmado (entram na receita). */
export const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/**
 * Mudanças que o ADMINISTRADOR pode fazer pelo painel.
 *
 * Não há caminho para PAID: só a confirmação do pagamento (webhook do
 * Stripe, Fase 7) marca um pedido como pago. Cancelar um pedido já pago
 * exige reembolso, que chega junto com o Stripe.
 */
export const ADMIN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
};

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from]?.includes(to) ?? false;
}
