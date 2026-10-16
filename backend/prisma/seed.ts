/**
 * Seed CONTROLADO do catálogo demonstrativo.
 *
 * - Apaga e recria SOMENTE as tabelas do catálogo, dentro de uma transação
 *   (se algo falhar no meio, nada é alterado).
 * - Recusa rodar em produção, a menos que SEED_ALLOW_PRODUCTION=true seja
 *   definido explicitamente (usado uma única vez para popular a demo).
 * - É determinístico: rodar duas vezes gera o mesmo resultado.
 *
 * Uso: npm run db:seed (dentro de backend/)
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ProductStatus } from '../src/generated/prisma/client.js';
import { categories, products, skuFor, stockFor, unsplashUrl } from './seed-data.js';

try {
  process.loadEnvFile();
} catch {
  // sem .env: usa as variáveis do ambiente
}

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
  console.error(
    'Seed bloqueado em produção. Defina SEED_ALLOW_PRODUCTION=true se for intencional.',
  );
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL não definida. Copie backend/.env.example para backend/.env.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  // Datas escalonadas: o primeiro produto da lista é o mais recente,
  // para que a ordenação por "novidades" seja previsível.
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;

  await prisma.$transaction(
    async (tx) => {
      await tx.productVariant.deleteMany();
      await tx.productImage.deleteMany();
      await tx.product.deleteMany();
      await tx.category.deleteMany();

      const categoryBySlug = new Map<string, { id: string; code: string }>();
      for (const [index, category] of categories.entries()) {
        const created = await tx.category.create({
          data: {
            name: category.name,
            slug: category.slug,
            description: category.description,
            sortOrder: index,
          },
        });
        categoryBySlug.set(category.slug, { id: created.id, code: category.code });
      }

      const countByCategory = new Map<string, number>();

      for (const [productIndex, product] of products.entries()) {
        const category = categoryBySlug.get(product.category);
        if (!category) throw new Error(`Categoria inexistente: ${product.category}`);

        const number = (countByCategory.get(product.category) ?? 0) + 1;
        countByCategory.set(product.category, number);

        await tx.product.create({
          data: {
            name: product.name,
            slug: product.slug,
            description: product.description,
            categoryId: category.id,
            priceCents: product.priceCents,
            compareAtPriceCents: product.compareAtPriceCents ?? null,
            isNew: product.isNew ?? false,
            status: ProductStatus.PUBLISHED,
            createdAt: new Date(now - productIndex * HOUR),
            images: {
              create: [{ url: unsplashUrl(product.photo.id), alt: product.photo.alt, position: 0 }],
            },
            variants: {
              create: product.colors.flatMap((color, colorIndex) =>
                product.sizes.map((size, sizeIndex) => ({
                  sku: skuFor(category.code, number, color.name, size),
                  color: color.name,
                  colorHex: color.hex,
                  size,
                  stock: stockFor(productIndex, colorIndex, sizeIndex),
                })),
              ),
            },
          },
        });
      }
    },
    { timeout: 30_000 },
  );

  const [categoryCount, productCount, variantCount] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
  ]);
  console.log(
    `Seed concluído: ${categoryCount} categorias, ${productCount} produtos, ${variantCount} variações.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Falha no seed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
