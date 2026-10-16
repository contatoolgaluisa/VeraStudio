import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Cria o cliente do Prisma.
 *
 * No Prisma 7, a conexão passa por um "driver adapter": aqui, o driver `pg`
 * (node-postgres). O cliente só abre conexões na primeira consulta.
 *
 * Em produção, DATABASE_URL aponta para o pooler do Supabase, que reaproveita
 * conexões e evita esgotar o limite do plano gratuito.
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export type { PrismaClient };
