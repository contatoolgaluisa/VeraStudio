import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from './config/env.js';
import type { Logger } from './lib/logger.js';
import type { PrismaClient } from './lib/prisma.js';
import { createErrorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { healthRouter } from './modules/health/health.routes.js';

/**
 * Dependências que o app recebe de fora. Assim os testes podem trocar
 * peças (ex.: simular um banco fora do ar) sem alterar o código da aplicação.
 */
export interface AppDependencies {
  config: AppConfig;
  logger: Logger;
  prisma: PrismaClient;
  checkDatabase: () => Promise<void>;
}

export function createApp({ config, logger, prisma, checkDatabase }: AppDependencies): Express {
  const app = express();

  // O Render fica atrás de um proxy reverso; isso faz req.ip ser o IP real do
  // cliente (necessário para o limite de requisições das próximas fases).
  app.set('trust proxy', 1);

  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // IMPORTANTE (Fase 7): o webhook do Stripe precisa do corpo BRUTO para
  // verificar a assinatura, então ele será registrado aqui, ANTES do express.json().

  app.use(express.json({ limit: '100kb' }));

  app.use('/health', healthRouter(checkDatabase));
  app.use('/catalog', catalogRouter(prisma));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
