// Configuração única de lint para o monorepo (formato "flat config" do ESLint).
// Regras de estilo (aspas, ponto e vírgula, quebras) ficam com o Prettier;
// o ESLint cuida apenas de erros prováveis e boas práticas.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    'backend/src/generated/**',
    'backend/prisma/migrations/**',
  ]),

  // Base para todo arquivo JS/TS
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      // Variáveis iniciadas com _ são intencionalmente não usadas (ex.: next do Express)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // Backend: ambiente Node
  {
    files: ['backend/**/*.ts', '*.js'],
    languageOptions: { globals: globals.node },
  },

  // Frontend: ambiente de navegador + regras de React
  {
    files: ['frontend/**/*.{ts,tsx}'],
    extends: [reactRefresh.configs.vite()],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Arquivos de configuração do frontend rodam em Node
  {
    files: ['frontend/*.config.ts'],
    languageOptions: { globals: globals.node },
  },
]);
