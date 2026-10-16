import { z } from 'zod';

export const MAX_CART_LINES = 50;

/**
 * O navegador envia SÓ o que o cliente escolheu: variação e quantidade.
 * Preço, nome e estoque são sempre buscados no banco.
 */
export const quoteSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        variantId: z.uuid('Variação inválida'),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .max(MAX_CART_LINES, `O carrinho aceita no máximo ${MAX_CART_LINES} itens diferentes`),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
