import { z } from 'zod';
import { parseReais } from '@/lib/format';

/**
 * Formulários do painel. Os campos de preço são texto ("129,90") e viram
 * centavos no envio. As mesmas regras são conferidas de novo no backend.
 */

const reais = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => (parseReais(value) ?? 0) > 0, message);

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome').max(120, 'Use no máximo 120 caracteres'),
    slug: z
      .string()
      .trim()
      .max(100)
      .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, 'Use só letras minúsculas, números e hífens'),
    description: z
      .string()
      .trim()
      .min(10, 'Escreva uma descrição (mínimo 10 caracteres)')
      .max(4000, 'Use no máximo 4000 caracteres'),
    categoryId: z.string().min(1, 'Escolha a categoria'),
    price: reais('Informe o preço, por exemplo 129,90'),
    compareAtPrice: z
      .string()
      .trim()
      .refine((value) => value === '' || (parseReais(value) ?? 0) > 0, 'Valor inválido'),
    isNew: z.boolean(),
  })
  .refine(
    (data) =>
      data.compareAtPrice === '' ||
      (parseReais(data.compareAtPrice) ?? 0) > (parseReais(data.price) ?? 0),
    { error: 'O preço "de" precisa ser maior que o preço de venda', path: ['compareAtPrice'] },
  );

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const variantFormSchema = z.object({
  color: z.string().trim().min(1, 'Informe a cor').max(40),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use o formato #RRGGBB'),
  size: z.string().trim().min(1, 'Informe o tamanho').max(10),
  sku: z
    .string()
    .trim()
    .min(3, 'Mínimo 3 caracteres')
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, 'Use letras, números e hífens'),
  stock: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, 'Informe um número inteiro (0 ou mais)'),
});

export type VariantFormValues = z.infer<typeof variantFormSchema>;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(60),
  description: z.string().trim().max(300, 'Use no máximo 300 caracteres'),
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, 'Informe um número inteiro'),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

/** "+5", "-2" ou "5": ajuste relativo de estoque, diferente de zero. */
export function parseStockDelta(input: string): number | null {
  const match = /^([+-]?)(\d{1,6})$/.exec(input.trim());
  if (!match) return null;
  const value = Number(match[2]) * (match[1] === '-' ? -1 : 1);
  return value === 0 ? null : value;
}
