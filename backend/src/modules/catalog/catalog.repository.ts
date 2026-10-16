import { type Prisma, ProductStatus } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../lib/prisma.js';
import type { ListProductsQuery } from './catalog.schemas.js';

/**
 * Camada de acesso ao banco do catálogo público.
 *
 * Regra central: a loja só enxerga produtos PUBLISHED e variações ativas.
 * Rascunhos e produtos arquivados nunca saem por aqui.
 */

const PUBLISHED = ProductStatus.PUBLISHED;

/** Variação que pode ser vendida agora: ativa e com estoque. */
const sellableVariant = {
  isActive: true,
  stock: { gt: 0 },
} satisfies Prisma.ProductVariantWhereInput;

const productSummarySelect = {
  id: true,
  slug: true,
  name: true,
  priceCents: true,
  compareAtPriceCents: true,
  isNew: true,
  category: { select: { slug: true, name: true } },
  images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
  variants: {
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: { color: true, colorHex: true, size: true, stock: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductSummaryRow = Prisma.ProductGetPayload<{ select: typeof productSummarySelect }>;

const productDetailSelect = {
  ...productSummarySelect,
  description: true,
  images: {
    orderBy: { position: 'asc' },
    select: { id: true, url: true, alt: true, color: true },
  },
  variants: {
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true, sku: true, color: true, colorHex: true, size: true, stock: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductDetailRow = Prisma.ProductGetPayload<{ select: typeof productDetailSelect }>;

/** Traduz os filtros da URL para uma consulta do Prisma. */
function buildProductWhere(filters: ListProductsQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: PUBLISHED };

  if (filters.q) {
    // ILIKE no PostgreSQL: "vestido" encontra "Vestido Midi Linho".
    where.name = { contains: filters.q, mode: 'insensitive' };
  }
  if (filters.category) {
    where.category = { slug: filters.category };
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.priceCents = { gte: filters.minPrice, lte: filters.maxPrice };
  }
  if (filters.onSale !== undefined) {
    where.compareAtPriceCents = filters.onSale ? { not: null } : null;
  }
  if (filters.isNew !== undefined) {
    where.isNew = filters.isNew;
  }
  if (filters.sizes?.length || filters.colors?.length) {
    // A MESMA variação precisa ter a cor E o tamanho pedidos, e estar disponível.
    // Assim, "Preto + M" não retorna um produto que só tem Preto/G e Branco/M.
    where.variants = {
      some: {
        ...sellableVariant,
        ...(filters.sizes?.length ? { size: { in: filters.sizes } } : {}),
        ...(filters.colors?.length ? { color: { in: filters.colors } } : {}),
      },
    };
  }

  return where;
}

const ORDER_BY: Record<ListProductsQuery['sort'], Prisma.ProductOrderByWithRelationInput[]> = {
  // O "id" no final garante uma ordem estável quando os valores empatam,
  // senão a paginação poderia repetir ou pular produtos.
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  price_asc: [{ priceCents: 'asc' }, { id: 'asc' }],
  price_desc: [{ priceCents: 'desc' }, { id: 'desc' }],
};

export function createCatalogRepository(prisma: PrismaClient) {
  return {
    listCategories() {
      return prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          _count: { select: { products: { where: { status: PUBLISHED } } } },
        },
      });
    },

    async listProducts(filters: ListProductsQuery) {
      const where = buildProductWhere(filters);

      // Contagem e página na mesma transação: os dois números são coerentes.
      const [total, rows] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: ORDER_BY[filters.sort],
          skip: (filters.page - 1) * filters.pageSize,
          take: filters.pageSize,
          select: productSummarySelect,
        }),
      ]);

      return { total, rows };
    },

    findPublishedBySlug(slug: string) {
      return prisma.product.findFirst({
        where: { slug, status: PUBLISHED },
        select: productDetailSelect,
      });
    },

    async getFilterOptions(categorySlug?: string) {
      const productWhere: Prisma.ProductWhereInput = {
        status: PUBLISHED,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      };

      const [variants, prices] = await prisma.$transaction([
        prisma.productVariant.findMany({
          where: { ...sellableVariant, product: productWhere },
          distinct: ['color', 'size'],
          orderBy: [{ color: 'asc' }],
          select: { color: true, colorHex: true, size: true },
        }),
        prisma.product.aggregate({
          where: productWhere,
          _min: { priceCents: true },
          _max: { priceCents: true },
        }),
      ]);

      return {
        variants,
        minPriceCents: prices._min.priceCents,
        maxPriceCents: prices._max.priceCents,
      };
    },
  };
}

export type CatalogRepository = ReturnType<typeof createCatalogRepository>;
