import { Prisma, ProductStatus } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { slugify } from '../../lib/slug.js';
import type { z } from 'zod';
import type {
  createProductSchema,
  createVariantSchema,
  listAdminProductsSchema,
  updateProductSchema,
  updateVariantSchema,
} from './admin.schemas.js';

export const LOW_STOCK_THRESHOLD = 3;

const adminProductDetail = {
  id: true,
  name: true,
  slug: true,
  description: true,
  priceCents: true,
  compareAtPriceCents: true,
  status: true,
  isNew: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, url: true, alt: true, color: true, position: true },
  },
  variants: {
    orderBy: [{ color: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      sku: true,
      color: true,
      colorHex: true,
      size: true,
      stock: true,
      isActive: true,
    },
  },
} satisfies Prisma.ProductSelect;

function conflictOnUnique(error: unknown, message: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new AppError(409, 'CONFLICT', message);
  }
  throw error;
}

export function createAdminProductsService(prisma: PrismaClient) {
  async function getProduct(id: string) {
    const product = await prisma.product.findUnique({ where: { id }, select: adminProductDetail });
    if (!product) throw AppError.notFound('Produto não encontrado');
    return product;
  }

  /** Regra de negócio: só vai para a loja produto com pelo menos uma variação ativa. */
  async function assertCanPublish(productId: string) {
    const activeVariants = await prisma.productVariant.count({
      where: { productId, isActive: true },
    });
    if (activeVariants === 0) {
      throw new AppError(
        422,
        'CANNOT_PUBLISH',
        'Cadastre ao menos uma variação ativa (cor e tamanho) antes de publicar.',
      );
    }
  }

  return {
    getProduct,

    async list(query: z.infer<typeof listAdminProductsSchema>) {
      const where: Prisma.ProductWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { variants: { some: { sku: { contains: query.q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      };
      const [total, rows] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            priceCents: true,
            compareAtPriceCents: true,
            isNew: true,
            updatedAt: true,
            category: { select: { name: true } },
            images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
            variants: { select: { stock: true, isActive: true } },
          },
        }),
      ]);

      return {
        data: rows.map(({ variants, images, ...product }) => ({
          ...product,
          image: images[0] ?? null,
          variantCount: variants.length,
          totalStock: variants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0),
        })),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      };
    },

    async create(input: z.infer<typeof createProductSchema>) {
      // Um produto novo ainda não tem variações, então nasce como rascunho.
      if (input.status === ProductStatus.PUBLISHED) {
        throw new AppError(
          422,
          'CANNOT_PUBLISH',
          'Salve o produto como rascunho, cadastre as variações e depois publique.',
        );
      }
      const slug = input.slug ?? slugify(input.name);
      try {
        const created = await prisma.product.create({
          data: { ...input, slug, compareAtPriceCents: input.compareAtPriceCents ?? null },
          select: { id: true },
        });
        return getProduct(created.id);
      } catch (error) {
        return conflictOnUnique(error, `Já existe um produto com o endereço "${slug}".`);
      }
    },

    async update(id: string, input: z.infer<typeof updateProductSchema>) {
      const current = await prisma.product.findUnique({
        where: { id },
        select: { priceCents: true, compareAtPriceCents: true },
      });
      if (!current) throw AppError.notFound('Produto não encontrado');

      // Confere o preço "de" contra o preço final (o que veio + o que já existe).
      const price = input.priceCents ?? current.priceCents;
      const compareAt =
        input.compareAtPriceCents !== undefined
          ? input.compareAtPriceCents
          : current.compareAtPriceCents;
      if (compareAt !== null && compareAt <= price) {
        throw new AppError(
          422,
          'INVALID_PRICE',
          'O preço "de" precisa ser maior que o preço de venda.',
        );
      }

      if (input.status === ProductStatus.PUBLISHED) await assertCanPublish(id);

      try {
        await prisma.product.update({ where: { id }, data: input });
      } catch (error) {
        conflictOnUnique(error, `Já existe um produto com o endereço "${input.slug}".`);
      }
      return getProduct(id);
    },

    async addVariant(productId: string, input: z.infer<typeof createVariantSchema>) {
      await getProduct(productId);
      try {
        await prisma.productVariant.create({ data: { ...input, productId } });
      } catch (error) {
        conflictOnUnique(
          error,
          'Já existe uma variação com este SKU, ou com esta mesma cor e tamanho neste produto.',
        );
      }
      return getProduct(productId);
    },

    async updateVariant(variantId: string, input: z.infer<typeof updateVariantSchema>) {
      const { stockDelta, ...fields } = input;
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { productId: true },
      });
      if (!variant) throw AppError.notFound('Variação não encontrada');

      await prisma.$transaction(async (tx) => {
        if (Object.keys(fields).length > 0) {
          try {
            await tx.productVariant.update({ where: { id: variantId }, data: fields });
          } catch (error) {
            conflictOnUnique(error, 'Já existe uma variação com este SKU.');
          }
        }

        if (stockDelta) {
          // Ajuste atômico: o próprio UPDATE confere que o estoque não fica
          // negativo. Se uma venda acontecer ao mesmo tempo, nada se perde.
          const updated = await tx.productVariant.updateMany({
            where: {
              id: variantId,
              ...(stockDelta < 0 ? { stock: { gte: -stockDelta } } : {}),
            },
            data: { stock: { increment: stockDelta } },
          });
          if (updated.count === 0) {
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              'O ajuste deixaria o estoque negativo. Atualize a página e confira o estoque atual.',
            );
          }
        }

        // Desativar a última variação ativa de um produto publicado o tiraria
        // da loja sem aviso: bloqueamos e explicamos.
        if (fields.isActive === false) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: variant.productId },
            select: {
              status: true,
              _count: { select: { variants: { where: { isActive: true } } } },
            },
          });
          if (product.status === ProductStatus.PUBLISHED && product._count.variants === 0) {
            throw new AppError(
              422,
              'LAST_ACTIVE_VARIANT',
              'Esta é a última variação ativa de um produto publicado. Arquive o produto ou ative outra variação antes.',
            );
          }
        }
      });

      return getProduct(variant.productId);
    },
  };
}

export type AdminProductsService = ReturnType<typeof createAdminProductsService>;
