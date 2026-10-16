import { pino, type Logger } from 'pino';

/**
 * Logger estruturado (JSON). Em produção, o Render coleta essas linhas.
 *
 * `redact` remove cabeçalhos sensíveis ANTES de escrever o log, para que
 * tokens de login e cookies nunca apareçam nos registros.
 */
export function createLogger(level: string): Logger {
  return pino({
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["stripe-signature"]',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
  });
}

export type { Logger };
