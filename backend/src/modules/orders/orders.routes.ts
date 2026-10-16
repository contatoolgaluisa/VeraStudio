import { type RequestHandler, Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { ShippingRule } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { createOrderSchema, listOrdersSchema, orderIdParamsSchema } from './orders.schemas.js';
import { createOrdersService } from './orders.service.js';

/**
 * Pedidos do cliente logado (montado em /orders). Todas as rotas exigem
 * login e só enxergam os pedidos do próprio usuário.
 *
 * POST /orders              cria o pedido e reserva o estoque
 * GET  /orders              meus pedidos (paginado)
 * GET  /orders/:id          detalhe de um pedido meu
 * POST /orders/:id/cancel   desiste de um pedido aguardando pagamento
 */
export function ordersRouter(options: {
  prisma: PrismaClient;
  requireAuth: RequestHandler;
  shipping: ShippingRule;
  /** Pedidos que cada cliente pode criar por minuto. */
  createLimitPerMinute: number;
}): Router {
  const service = createOrdersService(options.prisma, options.shipping);
  const router = Router();
  router.use(options.requireAuth);

  // Limite por USUÁRIO (a rota exige login), guardado em memória. Com um
  // único servidor (Render gratuito) isso basta; com vários, o contador
  // precisaria ficar num armazenamento compartilhado (ex.: Redis).
  const createLimiter = rateLimit({
    windowMs: 60_000,
    limit: options.createLimitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => req.user!.id,
    handler: (_req, _res, next) => {
      next(
        new AppError(
          429,
          'TOO_MANY_REQUESTS',
          'Muitas tentativas de criar pedidos. Aguarde um minuto e tente de novo.',
        ),
      );
    },
  });

  router.post('/', createLimiter, async (req, res) => {
    const { order, created } = await service.create(
      { id: req.user!.id, email: req.user!.email },
      createOrderSchema.parse(req.body),
    );
    res.status(created ? 201 : 200).json({ data: order });
  });

  router.get('/', async (req, res) => {
    const { page, pageSize } = listOrdersSchema.parse(req.query);
    res.json(await service.listMine(req.user!.id, page, pageSize));
  });

  router.get('/:id', async (req, res) => {
    const { id } = orderIdParamsSchema.parse(req.params);
    res.json({ data: await service.getMine(req.user!.id, id) });
  });

  router.post('/:id/cancel', async (req, res) => {
    const { id } = orderIdParamsSchema.parse(req.params);
    res.json({ data: await service.cancelMine(req.user!.id, id) });
  });

  return router;
}
