import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, type ErrorBody } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';

/** Rotas inexistentes caem aqui (registrado depois de todas as rotas). */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('Rota não encontrada'));
};

/** Erro do body-parser do Express quando o JSON enviado é inválido. */
function isBodyParseError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: unknown }).type === 'entity.parse.failed'
  );
}

/**
 * Tratamento centralizado de erros.
 *
 * Toda rota pode simplesmente lançar um erro (`throw`): no Express 5, erros
 * de funções assíncronas chegam aqui automaticamente.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    let status = 500;
    let body: ErrorBody = {
      error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro inesperado. Tente novamente.' },
    };

    if (err instanceof AppError) {
      status = err.statusCode;
      body = { error: { code: err.code, message: err.message, details: err.details } };
    } else if (err instanceof ZodError) {
      status = 400;
      body = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      };
    } else if (isBodyParseError(err)) {
      status = 400;
      body = {
        error: { code: 'INVALID_JSON', message: 'O corpo da requisição não é um JSON válido' },
      };
    }

    // Erros 5xx são registrados com stack trace para diagnóstico;
    // o cliente recebe apenas a mensagem genérica.
    if (status >= 500) {
      logger.error({ err }, 'Erro não tratado');
    }

    res.status(status).json(body);
  };
}
