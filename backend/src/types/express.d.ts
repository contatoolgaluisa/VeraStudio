import type { Role } from '../generated/prisma/client.js';

// Acrescenta `req.user` ao tipo de requisição do Express.
// Só é preenchido pelo middleware requireAuth, depois de verificar o token.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
