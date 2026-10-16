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
 * tratamento de erros. Com `token`, envia o login no cabeçalho Authorization.
 * Com `json`, envia o corpo como JSON.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string; json?: unknown } = {},
): Promise<T> {
  const { token, json, ...requestInit } = init;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(requestInit.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      ...requestInit,
      headers,
      body: json !== undefined ? JSON.stringify(json) : requestInit.body,
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
