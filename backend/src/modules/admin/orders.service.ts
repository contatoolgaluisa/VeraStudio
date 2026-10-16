import { OrderStatus, type Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { canAdminTransition } from '../orders/order-status.js';
import { orderDetailSelect, orderSummarySelect } from '../orders/orders.dto.js';
import { releaseExpiredReservations, releaseReservation } from '../orders/reservations.js';

const adminOrderDetailSelect = {
  ...orderDetailSelect,
  customerEmail: true,
  user: { select: { id: true, name: true, email: true } },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdAt: true,
      changedBy: { select: { email: true, role: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export function createAdminOrdersService(prisma: PrismaClient) {
  async function getOrder(id: string) {
    const order = await prisma.order.findUnique({ where: { id }, select: adminOrderDetailSelect });
    if (!order) throw AppError.notFound('Pedido não encontrado');
    return order;
  }

  return {
    getOrder: async (id: string) => {
      await releaseExpiredReservations(prisma);
      return getOrder(id);
    },

    async list(query: { q?: string; status?: OrderStatus; page: number; pageSize: number }) {
      await releaseExpiredReservations(prisma);
      // Busca por número do pedido ("1001" ou "#1001") ou por e-mail do cliente.
      const number = query.q ? /^#?(\d{1,9})$/.exec(query.q)?.[1] : undefined;
      const where: Prisma.OrderWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(number
          ? { number: Number(number) }
          : query.q
            ? { customerEmail: { contains: query.q, mode: 'insensitive' } }
            : {}),
      };
      const [total, data] = await prisma.$transaction([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: { ...orderSummarySelect, customerEmail: true },
        }),
      ]);
      return {
        data,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      };
    },

    /**
     * Muda a situação operacional do pedido, conferindo as transições
     * permitidas, e registra quem mudou, quando e por quê.
     */
    async updateStatus(id: string, adminId: string, to: OrderStatus, note: string | null) {
      const current = await prisma.order.findUnique({ where: { id }, select: { status: true } });
      if (!current) throw AppError.notFound('Pedido não encontrado');

      if (to === OrderStatus.PAID) {
        throw new AppError(
          422,
          'INVALID_TRANSITION',
          'Um pedido só fica "pago" com a confirmação do pagamento, nunca pelo painel.',
        );
      }
      if (!canAdminTransition(current.status, to)) {
        throw new AppError(
          422,
          'INVALID_TRANSITION',
          current.status === OrderStatus.PAID && to === OrderStatus.CANCELLED
            ? 'Cancelar um pedido pago exige reembolso, disponível junto com o pagamento (Fase 7).'
            : 'Esta mudança de situação não é permitida para o pedido.',
        );
      }

      if (to === OrderStatus.CANCELLED) {
        const released = await releaseReservation(
          prisma,
          id,
          OrderStatus.CANCELLED,
          adminId,
          note ?? 'Cancelado pela administração antes do pagamento.',
        );
        if (!released) throw statusChanged();
        return getOrder(id);
      }

      await prisma.$transaction(async (tx) => {
        // Condicional: se outra pessoa mudou a situação nesse meio-tempo, não sobrescreve.
        const changed = await tx.order.updateMany({
          where: { id, status: current.status },
          data: { status: to },
        });
        if (changed.count === 0) throw statusChanged();
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus: current.status,
            toStatus: to,
            changedById: adminId,
            note,
          },
        });
      });
      return getOrder(id);
    },
  };
}

function statusChanged() {
  return new AppError(
    409,
    'STATUS_CHANGED',
    'A situação deste pedido mudou enquanto você editava. Atualize a página.',
  );
}
