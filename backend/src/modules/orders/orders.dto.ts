import type { Prisma } from '../../generated/prisma/client.js';

/** Campos de um pedido que o próprio cliente pode ver. */
export const orderDetailSelect = {
  id: true,
  number: true,
  status: true,
  itemCount: true,
  subtotalCents: true,
  discountCents: true,
  shippingCents: true,
  totalCents: true,
  reservationExpiresAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { productName: 'asc' },
    select: {
      id: true,
      productName: true,
      productSlug: true,
      sku: true,
      color: true,
      size: true,
      imageUrl: true,
      unitPriceCents: true,
      compareAtPriceCents: true,
      quantity: true,
      lineTotalCents: true,
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    select: { fromStatus: true, toStatus: true, createdAt: true },
  },
} satisfies Prisma.OrderSelect;

export const orderSummarySelect = {
  id: true,
  number: true,
  status: true,
  itemCount: true,
  totalCents: true,
  reservationExpiresAt: true,
  createdAt: true,
} satisfies Prisma.OrderSelect;
