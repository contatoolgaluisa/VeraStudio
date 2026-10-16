import { type RequestHandler, Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import type { UsersRepository } from './users.repository.js';

// strictObject: campos desconhecidos (como "role") são recusados, não ignorados.
const updateMeSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .max(80, 'O nome pode ter no máximo 80 caracteres')
    .transform((name) => name || null),
});

/**
 * Rotas do próprio usuário logado (montadas em /me, atrás de requireAuth).
 *
 * GET   /me   perfil do usuário (inclui o papel, usado pelo frontend para
 *             mostrar ou esconder o link do painel; a proteção real é no servidor)
 * PATCH /me   altera o próprio nome. O papel NÃO pode ser alterado por aqui.
 */
export function meRouter(requireAuth: RequestHandler, users: UsersRepository): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req, res) => {
    if (!req.user) throw AppError.unauthenticated();
    const profile = await users.findById(req.user.id);
    if (!profile) throw AppError.unauthenticated();
    res.json({ data: profile });
  });

  router.patch('/', async (req, res) => {
    if (!req.user) throw AppError.unauthenticated();
    const { name } = updateMeSchema.parse(req.body);
    res.json({ data: await users.updateName(req.user.id, name) });
  });

  return router;
}
