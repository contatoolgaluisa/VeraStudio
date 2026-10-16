import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query guarda em cache as respostas da API, controla carregamento e
 * erro, e evita requisições repetidas. Um único cliente para o app todo.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // considera os dados "frescos" por 30s
        refetchOnWindowFocus: false,
      },
    },
  });
}
