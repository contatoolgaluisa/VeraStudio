/// <reference types="vite/client" />

// Tipagem das variáveis de ambiente públicas do frontend.
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
