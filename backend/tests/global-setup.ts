import { execSync } from 'node:child_process';

/**
 * Roda uma vez antes de todos os testes: aplica as migrations no banco de
 * TESTES (nunca no de desenvolvimento), garantindo que o schema esteja atualizado.
 */
export default function setup() {
  try {
    process.loadEnvFile();
  } catch {
    // sem .env: usa as variáveis do ambiente (ex.: CI)
  }

  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL não definida. Veja backend/.env.example e rode `npm run db:up` na raiz.',
    );
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL não pode ser igual a DATABASE_URL: os testes apagam dados.');
  }

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DIRECT_URL: url },
    });
  } catch (error) {
    const output = (error as { stderr?: Buffer; stdout?: Buffer }).stderr?.toString() ?? '';
    throw new Error(
      `Não foi possível preparar o banco de testes. O PostgreSQL está rodando? (npm run db:up)\n${output}`,
      { cause: error },
    );
  }
}
