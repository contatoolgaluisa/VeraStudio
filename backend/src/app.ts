import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from './config/env.js';
import type { Logger } from './lib/logger.js';
import { createErrorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { healthRouter } from './modules/health/health.routes.js';

/**
 * Dependências que o app recebe de fora. Assim os testes podem passar
 * versões falsas (ex.: um banco que "cai") sem precisar de um Postgres real.
 */
export interface AppDependencies {
  config: AppConfig;
  logger: Logger;
  checkDatabase: () => Promise<void>;
}

export function createApp({ config, logger, checkDatabase }: AppDependencies): Express {
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

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
