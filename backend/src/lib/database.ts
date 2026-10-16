import pg from 'pg';

/**
 * Conexão mínima com o PostgreSQL para a Fase 2.
 *
 * Por que não o Prisma ainda? O Prisma Client só é gerado quando o schema tem
 * modelos, e os modelos entram na Fase 3. Até lá, um pool do driver `pg`
 * (o mesmo driver que o Prisma 7 usa por baixo, via @prisma/adapter-pg)
 * basta para provar que a aplicação alcança o banco.
 *
 * Na Fase 3 este arquivo passa a exportar o PrismaClient.
 */
export function createDatabase(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5_000,
  });

  return {
    /** Lança erro se o banco não responder. */
    async ping(): Promise<void> {
      await pool.query('SELECT 1');
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

export type Database = ReturnType<typeof createDatabase>;
