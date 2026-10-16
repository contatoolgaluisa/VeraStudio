import { createApp } from './app.js';
import { type AppConfig, EnvValidationError, parseEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createPrismaClient } from './lib/prisma.js';

// Em desenvolvimento, lê backend/.env com o carregador nativo do Node.
// Em produção (Render) não há arquivo: as variáveis vêm do painel.
try {
  process.loadEnvFile();
} catch {
  // sem .env: segue com as variáveis do ambiente
}

function loadConfig(): AppConfig {
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const config = loadConfig();
const logger = createLogger(config.logLevel);
const prisma = createPrismaClient(config.databaseUrl);
const app = createApp({
  config,
  logger,
  prisma,
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
});

const server = app.listen(config.port, () => {
  logger.info(`API ouvindo em http://localhost:${config.port} (${config.nodeEnv})`);
});

// Desligamento gracioso: termina as requisições em andamento e fecha o banco
// quando o Render (ou o Ctrl+C) pede para o processo encerrar.
function shutdown(signal: string) {
  logger.info(`${signal} recebido, encerrando...`);
  server.close(() => {
    prisma
      .$disconnect()
      .catch((err: unknown) => logger.error({ err }, 'Erro ao fechar o banco'))
      .finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
