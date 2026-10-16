import { createApp, type AppDependencies } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { createLogger } from '../src/lib/logger.js';
import { createPrismaClient } from '../src/lib/prisma.js';
import { TEST_SUPABASE_URL, testTokenVerifier } from './auth-helpers.js';
import { createFakeStorage } from './fake-storage.js';

try {
  process.loadEnvFile();
} catch {
  // sem .env: usa as variáveis do ambiente (ex.: CI)
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL não definida');

export const testConfig: AppConfig = {
  nodeEnv: 'test',
  port: 0,
  logLevel: 'silent',
  databaseUrl: testDatabaseUrl,
  corsOrigins: ['http://localhost:5173'],
  supabaseUrl: TEST_SUPABASE_URL,
  supabaseSecretKey: null,
  shipping: { flatCents: 1990, freeMinCents: 29900 },
};

/** Storage em memória compartilhado pelos testes. */
export const fakeStorage = createFakeStorage();

/** Cliente do Prisma apontando para o banco de TESTES. */
export const testPrisma = createPrismaClient(testDatabaseUrl);

/** Cria o app com dependências de teste; cada teste pode sobrescrever o que precisar. */
export function buildTestApp(overrides: Partial<AppDependencies> = {}) {
  return createApp({
    config: testConfig,
    logger: createLogger('silent'),
    prisma: testPrisma,
    checkDatabase: async () => {},
    verifyToken: testTokenVerifier,
    imageStorage: fakeStorage.storage,
    // Os testes criam muitos pedidos seguidos; o limite tem um teste próprio.
    orderCreateLimitPerMinute: 1000,
    ...overrides,
  });
}

/** Apaga todos os dados do catálogo no banco de testes. */
export async function resetCatalog() {
  await testPrisma.$executeRawUnsafe(
    'TRUNCATE TABLE "product_variants", "product_images", "products", "categories" CASCADE',
  );
}

/** Apaga todos os pedidos (itens e histórico vão junto). */
export async function resetOrders() {
  await testPrisma.$executeRawUnsafe('TRUNCATE TABLE "orders" CASCADE');
}

/** Apaga todos os perfis de usuário no banco de testes. */
export async function resetUsers() {
  await testPrisma.$executeRawUnsafe('TRUNCATE TABLE "user_profiles" CASCADE');
}
