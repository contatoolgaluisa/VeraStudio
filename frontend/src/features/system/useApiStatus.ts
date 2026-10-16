import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface ReadyResponse {
  status: 'ok';
  database: 'up';
}

/**
 * Consulta GET /health/ready no backend (dado REAL, não simulado).
 * Usado na tela da Fase 2 para confirmar que frontend, API e banco conversam.
 */
export function useApiStatus() {
  return useQuery({
    queryKey: ['system', 'ready'],
    queryFn: () => apiFetch<ReadyResponse>('/health/ready'),
    retry: false,
  });
}
