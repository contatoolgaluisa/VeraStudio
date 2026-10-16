import type { RequestHandler } from 'express';
import type { Role } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { TokenVerifier } from './token-verifier.js';

/**
 * Exige um usuário logado. Lê o token do cabeçalho
 * `Authorization: Bearer <token>`, verifica e carrega o perfil do banco.
 *
 * Esconder botões no frontend não protege nada: é ESTE middleware, no
 * servidor, que decide quem pode o quê.
 */
export function requireAuth(verify: TokenVerifier, users: UsersRepository): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
    if (!token) throw AppError.unauthenticated();

    const verified = await verify(token);
    const profile = await users.findOrCreate(verified);
    req.user = { id: profile.id, email: profile.email, role: profile.role };
    next();
  };
}

/** Exige um papel específico. Usar SEMPRE depois de requireAuth. */
export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw AppError.unauthenticated();
    if (req.user.role !== role) throw AppError.forbidden();
    next();
  };
}
