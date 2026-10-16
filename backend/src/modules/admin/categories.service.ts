import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { slugify } from '../../lib/slug.js';
import type { z } from 'zod';
import type { categorySchema, updateCategorySchema } from './admin.schemas.js';

export function createAdminCategoriesService(prisma: PrismaClient) {
  function conflict(error: unknown, slug: string | undefined): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'CONFLICT', `Já existe uma categoria com o endereço "${slug}".`);
    }
    throw error;
  }

  return {
    list() {
      return prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          sortOrder: true,
          _count: { select: { products: true } },
        },
      });
    },

    async create(input: z.infer<typeof categorySchema>) {
      const slug = input.slug ?? slugify(input.name);
      try {
        return await prisma.category.create({ data: { ...input, slug } });
      } catch (error) {
        return conflict(error, slug);
      }
    },

    async update(id: string, input: z.infer<typeof updateCategorySchema>) {
      try {
        return await prisma.category.update({ where: { id }, data: input });
      } catch (error) {
        return conflict(error, input.slug);
      }
    },

    async remove(id: string) {
      const products = await prisma.product.count({ where: { categoryId: id } });
      if (products > 0) {
        throw new AppError(
          409,
          'CATEGORY_IN_USE',
          `Esta categoria tem ${products} produto(s). Mova-os para outra categoria antes de excluir.`,
        );
      }
      await prisma.category.delete({ where: { id } });
    },
  };
}
