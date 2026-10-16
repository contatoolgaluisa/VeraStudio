import { env } from '@/config/env';

/** Erro de API com o formato padronizado do backend: { error: { code, message } }. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Cliente HTTP mínimo da aplicação. Centraliza a URL base, o JSON e o
 * tratamento de erros; nas próximas fases também anexará o token de login.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init.headers as Record<string, string>) },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor.');
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Erro ${response.status}`,
    );
  }

  return body as T;
}
