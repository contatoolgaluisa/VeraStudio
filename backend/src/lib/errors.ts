/**
 * Erro "esperado" da aplicação: algo que o cliente pode corrigir ou precisa saber
 * (recurso não encontrado, estoque insuficiente, sem permissão...).
 *
 * Qualquer outro erro é tratado como falha interna e responde com uma
 * mensagem genérica, sem expor detalhes do servidor.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(message = 'Recurso não encontrado') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static unauthenticated(message = 'Faça login para continuar.') {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'Você não tem permissão para esta ação.') {
    return new AppError(403, 'FORBIDDEN', message);
  }
}

/** Formato único de resposta de erro em toda a API. */
export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
