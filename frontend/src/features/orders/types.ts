/** Formatos da API de pedidos (ver docs/api.md). Valores em centavos. */

export type OrderStatus =
  'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'EXPIRED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  PROCESSING: 'Em separação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

/**
 * Mudanças que o painel oferece como botões. É só a tela: quem confere de
 * verdade é o backend (orders/order-status.ts), que também recusa "pago".
 */
export const ADMIN_NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
};

export interface OrderItem {
  id: string;
  productName: string;
  productSlug: string;
  sku: string;
  color: string;
  size: string;
  imageUrl: string | null;
  unitPriceCents: number;
  compareAtPriceCents: number | null;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderTotals {
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

export interface OrderSummary {
  id: string;
  number: number;
  status: OrderStatus;
  itemCount: number;
  totalCents: number;
  reservationExpiresAt: string;
  createdAt: string;
}

export interface StatusChange {
  id?: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  createdAt: string;
  note?: string | null;
  changedBy?: { email: string; role: 'CUSTOMER' | 'ADMIN' } | null;
}

export interface OrderDetail extends OrderTotals {
  id: string;
  number: number;
  status: OrderStatus;
  reservationExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  statusHistory: StatusChange[];
}

export interface AdminOrderDetail extends OrderDetail {
  customerEmail: string;
  user: { id: string; name: string | null; email: string };
}

export interface AdminOrderSummary extends OrderSummary {
  customerEmail: string;
}

export interface Paged<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CartProblem {
  variantId: string;
  reason: 'NOT_FOUND' | 'UNAVAILABLE' | 'INSUFFICIENT_STOCK';
}
