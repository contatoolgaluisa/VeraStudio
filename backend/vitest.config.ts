import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Prepara o banco de TESTES (aplica as migrations) uma vez antes de tudo.
    globalSetup: ['./tests/global-setup.ts'],
    // Os arquivos de teste compartilham o mesmo banco, então rodam um por vez
    // para que um teste não apague os dados que outro está usando.
    fileParallelism: false,
  },
});
