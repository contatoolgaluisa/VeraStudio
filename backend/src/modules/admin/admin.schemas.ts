import { z } from 'zod';
import { SLUG_PATTERN } from '../../lib/slug.js';

/** Validação de tudo que o painel envia. Valores em centavos. */

const slug = z
  .string()
  .trim()
  .max(100)
  .regex(SLUG_PATTERN, 'Use só letras minúsculas, números e hífens');
const priceCents = z.number().int('Use centavos (número inteiro)').min(1).max(10_000_000);
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor no formato #RRGGBB');
const uuid = z.uuid('Identificador inválido');

export const productStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const idParamsSchema = z.object({ id: uuid });

export const listAdminProductsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || undefined),
  status: productStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const productFields = {
  name: z.string().trim().min(2, 'Informe o nome').max(120),
  slug: slug.optional(),
  description: z.string().trim().min(10, 'Escreva uma descrição (mínimo 10 caracteres)').max(4000),
  categoryId: uuid,
  priceCents,
  compareAtPriceCents: priceCents.nullable().optional(),
  status: productStatusSchema.default('DRAFT'),
  isNew: z.boolean().default(false),
};

function compareAtAbovePrice(data: { priceCents?: number; compareAtPriceCents?: number | null }) {
  if (data.priceCents === undefined || data.compareAtPriceCents == null) return true;
  return data.compareAtPriceCents > data.priceCents;
}

const compareAtMessage = {
  error: 'O preço "de" precisa ser maior que o preço de venda',
  path: ['compareAtPriceCents'],
};

export const createProductSchema = z
  .strictObject(productFields)
  .refine(compareAtAbovePrice, compareAtMessage);

export const updateProductSchema = z
  .strictObject({
    name: productFields.name.optional(),
    slug: slug.optional(),
    description: productFields.description.optional(),
    categoryId: uuid.optional(),
    priceCents: priceCents.optional(),
    compareAtPriceCents: priceCents.nullable().optional(),
    status: productStatusSchema.optional(),
    isNew: z.boolean().optional(),
  })
  .refine(compareAtAbovePrice, compareAtMessage);

const sku = z
  .string()
  .trim()
  .toUpperCase()
  .min(3)
  .max(40)
  .regex(/^[A-Z0-9-]+$/, 'SKU: use letras, números e hífens');

export const createVariantSchema = z.strictObject({
  color: z.string().trim().min(1, 'Informe a cor').max(40),
  colorHex: hex,
  size: z.string().trim().toUpperCase().min(1, 'Informe o tamanho').max(10),
  sku,
  stock: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
});

export const updateVariantSchema = z.strictObject({
  colorHex: hex.optional(),
  sku: sku.optional(),
  isActive: z.boolean().optional(),
  /**
   * Ajuste RELATIVO de estoque (+5 entrou mercadoria, -2 avaria). Relativo e
   * não absoluto para não apagar vendas que aconteçam enquanto o admin edita.
   */
  stockDelta: z.number().int().min(-100_000).max(100_000).optional(),
});

export const categorySchema = z.strictObject({
  name: z.string().trim().min(2, 'Informe o nome').max(60),
  slug: slug.optional(),
  description: z.string().trim().max(300).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

export const updateCategorySchema = categorySchema.partial();

export const uploadUrlSchema = z.strictObject({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    error: 'Envie uma imagem JPG, PNG ou WebP',
  }),
});

export const createImageSchema = z.strictObject({
  path: z.string().min(1).max(300),
  alt: z.string().trim().min(3, 'Descreva a foto (texto alternativo)').max(200),
  color: z.string().trim().max(40).nullable().optional(),
});

export const updateImageSchema = z.strictObject({
  alt: createImageSchema.shape.alt.optional(),
  color: z.string().trim().max(40).nullable().optional(),
  position: z.number().int().min(0).max(1000).optional(),
});
