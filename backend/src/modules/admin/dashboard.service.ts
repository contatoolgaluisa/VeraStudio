import { ProductStatus } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { LOW_STOCK_THRESHOLD } from './products.service.js';

/**
 * Indicadores do painel, calculados na hora a partir do banco.
 * Pedidos e receita só existirão na Fase 6: a resposta diz isso (null),
 * em vez de inventar números.
 */
export function createDashboardService(prisma: PrismaClient) {
  return {
    async summary() {
      // Estoque baixo só importa para o que está à venda ou indo para a venda.
      const lowStockWhere = {
        isActive: true,
        stock: { lte: LOW_STOCK_THRESHOLD },
        product: { status: { not: ProductStatus.ARCHIVED } },
      };

      const [byStatus, lowStockCount, outOfStockCount, lowStockItems] = await prisma.$transaction([
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
      ]);

      const count = (status: ProductStatus) =>
        byStatus.find((row) => row.status === status)?._count._all ?? 0;
      const draft = count(ProductStatus.DRAFT);
      const published = count(ProductStatus.PUBLISHED);
      const archived = count(ProductStatus.ARCHIVED);

      return {
        products: { total: draft + published + archived, published, draft, archived },
        stock: { threshold: LOW_STOCK_THRESHOLD, lowStock: lowStockCount, outOfStock: outOfStockCount },
        lowStockItems,
        // Fase 6: pedidos recebidos, pendentes e receita de pedidos pagos.
        orders: null,
      };
    },
  };
}
