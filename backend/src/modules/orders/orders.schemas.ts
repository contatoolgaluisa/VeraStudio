import { z } from 'zod';
import { quoteSchema } from '../cart/cart.schemas.js';

export const createOrderSchema = z.strictObject({
  items: quoteSchema.shape.items.min(1, 'O carrinho está vazio'),
  /**
   * Gerada pelo navegador uma vez por tentativa de compra. Se o pedido for
   * enviado duas vezes (clique duplo, conexão instável), o segundo envio
   * devolve o mesmo pedido em vez de criar outro.
   */
  idempotencyKey: z.uuid('Chave de envio inválida'),
});

export const orderIdParamsSchema = z.object({ id: z.uuid('Pedido inválido') });

export const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
