import { Router } from 'express';
import type { ShippingRule } from '../../config/env.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { quoteSchema } from './cart.schemas.js';
import { createCartService } from './cart.service.js';

/**
 * Carrinho (montado em /cart). O carrinho fica guardado no navegador
 * (decisão D3); esta rota recalcula tudo a partir do banco: preços,
 * disponibilidade, quantidades máximas, descontos e frete.
 *
 * POST, e não GET, porque recebe uma lista no corpo da requisição.
 * Não altera nada no banco e não exige login.
 */
export function cartRouter(prisma: PrismaClient, shipping: ShippingRule): Router {
  const service = createCartService(prisma, shipping);
  const router = Router();

  router.post('/quote', async (req, res) => {
    res.json({ data: await service.quote(quoteSchema.parse(req.body)) });
  });

  return router;
}
