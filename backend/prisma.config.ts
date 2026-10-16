// Configuração da CLI do Prisma (Prisma 7+).
// A partir da versão 7, a URL do banco fica aqui, e não mais no schema.prisma.
import { defineConfig, env } from 'prisma/config';

// O Prisma 7 não lê o .env sozinho. Usamos o carregador nativo do Node
// e ignoramos a ausência do arquivo (no Render as variáveis vêm do painel).
try {
  process.loadEnvFile();
} catch {
  // sem .env: segue com as variáveis do ambiente
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
  },
});
