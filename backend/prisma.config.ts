// Configuração da CLI do Prisma (Prisma 7+).
// A partir da versão 7, a URL do banco fica aqui, e não mais no schema.prisma.
import { defineConfig, env } from 'prisma/config';

// O Prisma 7 não lê o .env sozinho. Usamos o carregador nativo do Node.
// Se DIRECT_URL já veio do ambiente (Render, CI ou os testes, que apontam
// para o banco de testes), o .env não é lido, para não sobrescrever nada.
if (!process.env.DIRECT_URL) {
  try {
    process.loadEnvFile();
  } catch {
    // sem .env: segue com as variáveis do ambiente
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Migrations usam a conexão DIRETA (não o pooler), pois precisam de
    // recursos de sessão que o pooler em modo transação não oferece.
    url: env('DIRECT_URL'),
    // Banco temporário de conferência das migrations. Opcional: localmente o
    // `prisma migrate dev` cria um sozinho; o CI informa um próprio.
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
});
