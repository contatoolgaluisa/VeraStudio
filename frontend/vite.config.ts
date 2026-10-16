import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Configuração do Vite (dev server e build) e do Vitest (testes) no mesmo arquivo.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    env: {
      VITE_API_URL: 'http://localhost:3333',
      VITE_SUPABASE_URL: 'https://projeto-teste.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_chave_de_teste_000000',
    },
  },
});
