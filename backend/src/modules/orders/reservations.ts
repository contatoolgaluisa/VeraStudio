import { OrderStatus } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../lib/prisma.js';

/**
 * Libera o estoque reservado por um pedido que NÃO foi pago
 * (expirado ou cancelado) e registra a mudança no histórico.
 *
 * Tudo numa transação, e a mudança de situação é condicional
 * ("só se ainda estiver aguardando pagamento"). Se duas liberações
 * acontecerem ao mesmo tempo (o cliente cancela no exato momento em que a
 * reserva expira), só uma muda a situação, e o estoque volta uma vez só.
 *
 * Devolve true se esta chamada liberou o pedido.
 */
export async function releaseReservation(
  prisma: PrismaClient,
  orderId: string,
  toStatus: typeof OrderStatus.CANCELLED | typeof OrderStatus.EXPIRED,
  actorId: string | null,
  note: string | null,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: OrderStatus.PENDING_PAYMENT },
      data: { status: toStatus },
    });
    if (changed.count === 0) return false;

    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { variantId: true, quantity: true },
      orderBy: { variantId: 'asc' },
    });
    for (const item of items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: OrderStatus.PENDING_PAYMENT,
        toStatus,
        changedById: actorId,
        note,
      },
    });
    return true;
  });
}

/**
 * Expira as reservas vencidas. Roda a cada minuto no servidor e também
 * antes de criar pedidos e de listar pedidos: no plano gratuito do Render
 * o servidor "dorme", então não dá para depender só do relógio.
 */
export async function releaseExpiredReservations(
  prisma: PrismaClient,
  now = new Date(),
): Promise<number> {
  const expired = await prisma.order.findMany({
    where: { status: OrderStatus.PENDING_PAYMENT, reservationExpiresAt: { lte: now } },
    select: { id: true },
    orderBy: { reservationExpiresAt: 'asc' },
    take: 100,
  });

  let released = 0;
  for (const { id } of expired) {
    const done = await releaseReservation(
      prisma,
      id,
      OrderStatus.EXPIRED,
      null,
      'Reserva expirada: pagamento não concluído em 30 minutos.',
    );
    if (done) released += 1;
  }
  return released;
}
