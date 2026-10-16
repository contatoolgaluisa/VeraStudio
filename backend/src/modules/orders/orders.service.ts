import type { ShippingRule } from '../../config/env.js';
import { OrderStatus, Prisma, ProductStatus } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { MAX_QUANTITY_PER_ITEM } from '../catalog/catalog.schemas.js';
import { computeTotals } from '../cart/pricing.js';
import { MAX_PENDING_ORDERS_PER_USER, RESERVATION_MINUTES } from './order-status.js';
import { orderDetailSelect, orderSummarySelect } from './orders.dto.js';
import type { CreateOrderInput } from './orders.schemas.js';
import { releaseExpiredReservations, releaseReservation } from './reservations.js';

type Customer = { id: string; email: string };

export type CartProblem = {
  variantId: string;
  reason: 'NOT_FOUND' | 'UNAVAILABLE' | 'INSUFFICIENT_STOCK';
};

function cartChanged(problems: CartProblem[]): AppError {
  return new AppError(
    409,
    'CART_CHANGED',
    'Alguns itens do carrinho mudaram de preço ou disponibilidade. Revise o carrinho e confirme de novo.',
    problems,
  );
}

function mergeItems(items: CreateOrderInput['items']) {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  }
  // Ordem fixa (por id): duas compras simultâneas travam as variações na
  // mesma sequência e não ficam esperando uma pela outra (deadlock).
  return [...merged]
    .map(([variantId, quantity]) => ({ variantId, quantity }))
    .sort((a, b) => a.variantId.localeCompare(b.variantId));
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export function createOrdersService(prisma: PrismaClient, shipping: ShippingRule) {
  const findByKey = (userId: string, idempotencyKey: string) =>
    prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: orderDetailSelect,
    });

  return {
    /**
     * Cria o pedido e RESERVA o estoque (decisão D6), tudo numa transação:
     * se qualquer item não puder ser reservado, nada é reservado.
     */
    async create(customer: Customer, input: CreateOrderInput) {
      const existing = await findByKey(customer.id, input.idempotencyKey);
      if (existing) return { order: existing, created: false };

      await releaseExpiredReservations(prisma);

      const pending = await prisma.order.count({
        where: { userId: customer.id, status: OrderStatus.PENDING_PAYMENT },
      });
      if (pending >= MAX_PENDING_ORDERS_PER_USER) {
        throw new AppError(
          409,
          'TOO_MANY_PENDING_ORDERS',
          'Você já tem pedidos aguardando pagamento. Conclua ou cancele um deles antes de criar outro.',
        );
      }

      const items = mergeItems(input.items);

      try {
        const order = await prisma.$transaction(async (tx) => {
          const variants = await tx.productVariant.findMany({
            where: { id: { in: items.map((item) => item.variantId) } },
            select: {
              id: true,
              sku: true,
              color: true,
              size: true,
              stock: true,
              isActive: true,
              product: {
                select: {
                  name: true,
                  slug: true,
                  status: true,
                  priceCents: true,
                  compareAtPriceCents: true,
                  images: {
                    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
                    select: { url: true, color: true },
                  },
                },
              },
            },
          });
          const byId = new Map(variants.map((variant) => [variant.id, variant]));

          // 1. Confere tudo antes de mexer no estoque, para devolver a lista
          //    completa de problemas de uma vez.
          const problems: CartProblem[] = [];
          for (const item of items) {
            const variant = byId.get(item.variantId);
            if (!variant) problems.push({ variantId: item.variantId, reason: 'NOT_FOUND' });
            else if (!variant.isActive || variant.product.status !== ProductStatus.PUBLISHED)
              problems.push({ variantId: item.variantId, reason: 'UNAVAILABLE' });
            else if (item.quantity > Math.min(variant.stock, MAX_QUANTITY_PER_ITEM))
              problems.push({ variantId: item.variantId, reason: 'INSUFFICIENT_STOCK' });
          }
          if (problems.length > 0) throw cartChanged(problems);

          // 2. Reserva: cada baixa só acontece se ainda houver estoque NAQUELE
          //    instante. Se outra compra levou a última peça entre a conferência
          //    e aqui, o UPDATE não altera nada e a transação inteira é desfeita.
          for (const item of items) {
            const reserved = await tx.productVariant.updateMany({
              where: {
                id: item.variantId,
                isActive: true,
                stock: { gte: item.quantity },
                product: { status: ProductStatus.PUBLISHED },
              },
              data: { stock: { decrement: item.quantity } },
            });
            if (reserved.count === 0) {
              throw cartChanged([{ variantId: item.variantId, reason: 'INSUFFICIENT_STOCK' }]);
            }
          }

          // 3. Valores calculados aqui, com os preços do banco.
          const lines = items.map((item) => {
            const variant = byId.get(item.variantId)!;
            const { product } = variant;
            const image =
              product.images.find((img) => img.color === variant.color) ?? product.images[0];
            return {
              variantId: variant.id,
              productName: product.name,
              productSlug: product.slug,
              sku: variant.sku,
              color: variant.color,
              size: variant.size,
              imageUrl: image?.url ?? null,
              unitPriceCents: product.priceCents,
              compareAtPriceCents:
                product.compareAtPriceCents !== null &&
                product.compareAtPriceCents > product.priceCents
                  ? product.compareAtPriceCents
                  : null,
              quantity: item.quantity,
              lineTotalCents: product.priceCents * item.quantity,
            };
          });
          const totals = computeTotals(lines, shipping);

          return tx.order.create({
            data: {
              userId: customer.id,
              customerEmail: customer.email,
              idempotencyKey: input.idempotencyKey,
              itemCount: totals.itemCount,
              subtotalCents: totals.subtotalCents,
              discountCents: totals.discountCents,
              shippingCents: totals.shippingCents,
              totalCents: totals.totalCents,
              reservationExpiresAt: new Date(Date.now() + RESERVATION_MINUTES * 60_000),
              items: { create: lines },
              statusHistory: {
                create: {
                  toStatus: OrderStatus.PENDING_PAYMENT,
                  changedById: customer.id,
                  note: 'Pedido criado. Estoque reservado.',
                },
              },
            },
            select: orderDetailSelect,
          });
        });
        return { order, created: true };
      } catch (error) {
        // Mesmo envio chegando duas vezes ao mesmo tempo: o segundo esbarra na
        // chave única, a transação dele é desfeita (estoque devolvido) e ele
        // responde com o pedido que o primeiro criou.
        if (isUniqueViolation(error)) {
          const order = await findByKey(customer.id, input.idempotencyKey);
          if (order) return { order, created: false };
        }
        throw error;
      }
    },

    async listMine(userId: string, page: number, pageSize: number) {
      await releaseExpiredReservations(prisma);
      const where = { userId };
      const [total, data] = await prisma.$transaction([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: orderSummarySelect,
        }),
      ]);
      return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    },

    /** Pedido de outra pessoa responde 404, como se não existisse. */
    async getMine(userId: string, orderId: string) {
      await releaseExpiredReservations(prisma);
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        select: orderDetailSelect,
      });
      if (!order) throw AppError.notFound('Pedido não encontrado');
      return order;
    },

    async cancelMine(userId: string, orderId: string) {
      const owned = await prisma.order.count({ where: { id: orderId, userId } });
      if (!owned) throw AppError.notFound('Pedido não encontrado');

      const released = await releaseReservation(
        prisma,
        orderId,
        OrderStatus.CANCELLED,
        userId,
        'Cancelado pelo cliente antes do pagamento.',
      );
      if (!released) {
        throw new AppError(
          409,
          'CANNOT_CANCEL',
          'Este pedido não está mais aguardando pagamento e não pode ser cancelado por aqui.',
        );
      }
      return prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: orderDetailSelect });
    },
  };
}
