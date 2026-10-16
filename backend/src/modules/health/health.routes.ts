import { Router } from 'express';

/**
 * Health checks:
 * - GET /health        -> "o processo está de pé?" (usado pelo Render; não toca no banco)
 * - GET /health/ready  -> "a API consegue atender?" (verifica o banco)
 *
 * Separar os dois evita que uma instabilidade momentânea do banco faça o
 * Render reiniciar o servidor sem necessidade.
 */
export function healthRouter(checkDatabase: () => Promise<void>): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/ready', async (req, res) => {
    try {
      await checkDatabase();
      res.json({ status: 'ok', database: 'up' });
    } catch (err) {
      req.log.warn({ err }, 'Banco de dados indisponível no health check');
      res.status(503).json({ status: 'unavailable', database: 'down' });
    }
  });

  return router;
}
