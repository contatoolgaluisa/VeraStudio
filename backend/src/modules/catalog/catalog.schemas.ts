import { z } from 'zod';

/** Limite de unidades de uma mesma variação por pedido (também exibido na loja). */
export const MAX_QUANTITY_PER_ITEM = 10;

const slug = z
  .string()
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug inválido');

/** "P,M,G" -> ["P", "M", "G"] */
const commaList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().max(40)).max(20));

const booleanParam = z.enum(['true', 'false']).transform((value) => value === 'true');

/** Preço em centavos, recebido como texto na URL. */
const priceParam = z.coerce.number().int().min(0).max(10_000_000);

export const listProductsQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => value || undefined),
    category: slug.optional(),
    minPrice: priceParam.optional(),
    maxPrice: priceParam.optional(),
    sizes: commaList.optional(),
    colors: commaList.optional(),
    onSale: booleanParam.optional(),
    isNew: booleanParam.optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(12),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    { message: 'minPrice não pode ser maior que maxPrice', path: ['minPrice'] },
  );

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const productSlugParamsSchema = z.object({ slug });

export const filterOptionsQuerySchema = z.object({ category: slug.optional() });
