import { createApp, type AppDependencies } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { createLogger } from '../src/lib/logger.js';

export const testConfig: AppConfig = {
  nodeEnv: 'test',
  port: 0,
  logLevel: 'silent',
  databaseUrl: 'postgresql://test:test@localhost:5432/test',
  corsOrigins: ['http://localhost:5173'],
};

/** Cria o app com dependências de teste; cada teste pode sobrescrever o que precisar. */
export function buildTestApp(overrides: Partial<AppDependencies> = {}) {
  return createApp({
    config: testConfig,
    logger: createLogger('silent'),
    checkDatabase: async () => {},
    ...overrides,
  });
}
