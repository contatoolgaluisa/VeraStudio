import { OrderStatus, ProductStatus } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { PAID_STATUSES } from '../orders/order-status.js';
import { releaseExpiredReservations } from '../orders/reservations.js';
import { LOW_STOCK_THRESHOLD } from './products.service.js';

/**
 * Indicadores do painel, calculados na hora a partir do banco.
 * A receita conta só pedidos com pagamento confirmado (que só existem a
 * partir da Fase 7, com o Stripe): antes disso, ela é zero de verdade.
 */
export function createDashboardService(prisma: PrismaClient) {
  return {
    async summary() {
      await releaseExpiredReservations(prisma);

      // Estoque baixo só importa para o que está à venda ou indo para a venda.
      const lowStockWhere = {
        isActive: true,
        stock: { lte: LOW_STOCK_THRESHOLD },
        product: { status: { not: ProductStatus.ARCHIVED } },
      };

      const [byStatus, lowStockCount, outOfStockCount, lowStockItems, ordersByStatus, paidRevenue] =
        await prisma.$transaction([
          prisma.product.groupBy({
            by: ['status'],
            orderBy: { status: 'asc' },
            _count: { _all: true },
          }),
          prisma.productVariant.count({ where: lowStockWhere }),
          prisma.productVariant.count({ where: { ...lowStockWhere, stock: 0 } }),
          prisma.productVariant.findMany({
            where: lowStockWhere,
            orderBy: [{ stock: 'asc' }, { sku: 'asc' }],
            take: 10,
            select: {
              sku: true,
              color: true,
              size: true,
              stock: true,
              product: { select: { id: true, name: true } },
            },
          }),
          prisma.order.groupBy({
            by: ['status'],
            orderBy: { status: 'asc' },
            _count: { _all: true },
          }),
          prisma.order.aggregate({
            where: { status: { in: PAID_STATUSES } },
            _sum: { totalCents: true },
          }),
        ]);

      const orderCount = (statuses: OrderStatus[]) =>
        ordersByStatus
          .filter((row) => statuses.includes(row.status))
          .reduce((sum, row) => sum + (row._count as { _all: number })._all, 0);

      const count = (status: ProductStatus) =>
        byStatus.find((row) => row.status === status)?._count._all ?? 0;
      const draft = count(ProductStatus.DRAFT);
      const published = count(ProductStatus.PUBLISHED);
      const archived = count(ProductStatus.ARCHIVED);

      return {
        products: { total: draft + published + archived, published, draft, archived },
        stock: {
          threshold: LOW_STOCK_THRESHOLD,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
        },
        lowStockItems,
        orders: {
          total: orderCount(Object.values(OrderStatus)),
          pendingPayment: orderCount([OrderStatus.PENDING_PAYMENT]),
          toFulfill: orderCount([OrderStatus.PAID, OrderStatus.PROCESSING]),
          paidRevenueCents: paidRevenue._sum.totalCents ?? 0,
        },
      };
    },
  };
}
