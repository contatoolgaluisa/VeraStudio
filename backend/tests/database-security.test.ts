import { afterAll, describe, expect, it } from 'vitest';
import { testPrisma } from './helpers.js';

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('segurança do banco', () => {
  /**
   * No Supabase, toda tabela do schema `public` fica exposta pela API
   * automática (com a chave pública do site). Com RLS ativado e nenhuma
   * política, essa API não lê nem altera nada; só a nossa API acessa os
   * dados. Este teste falha se uma tabela nova esquecer o RLS.
   */
  it('todas as tabelas do schema public têm Row Level Security ativado', async () => {
    const withoutRls = await testPrisma.$queryRaw<{ table: string }[]>`
      SELECT c.relname AS "table"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
      ORDER BY c.relname`;

    expect(withoutRls).toEqual([]);
  });
});
