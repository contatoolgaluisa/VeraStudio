import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../lib/prisma.js';
import type { VerifiedToken } from '../auth/token-verifier.js';

const profileSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserProfileSelect;

export type Profile = Prisma.UserProfileGetPayload<{ select: typeof profileSelect }>;

export function createUsersRepository(prisma: PrismaClient) {
  return {
    /**
     * Busca o perfil do usuário logado, criando-o no primeiro acesso.
     * O papel NUNCA vem do token: perfis novos são sempre CUSTOMER.
     */
    async findOrCreate(token: VerifiedToken): Promise<Profile> {
      const existing = await prisma.userProfile.findUnique({
        where: { id: token.userId },
        select: profileSelect,
      });

      if (existing) {
        // O e-mail pode ter sido alterado no Supabase: mantemos sincronizado.
        if (existing.email === token.email) return existing;
        return prisma.userProfile.update({
          where: { id: token.userId },
          data: { email: token.email },
          select: profileSelect,
        });
      }

      try {
        return await prisma.userProfile.create({
          data: { id: token.userId, email: token.email, name: token.name },
          select: profileSelect,
        });
      } catch (error) {
        // Duas requisições simultâneas no primeiro acesso: a segunda encontra
        // o perfil já criado pela primeira (violação de chave única, P2002).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return prisma.userProfile.findUniqueOrThrow({
            where: { id: token.userId },
            select: profileSelect,
          });
        }
        throw error;
      }
    },

    findById(id: string): Promise<Profile | null> {
      return prisma.userProfile.findUnique({ where: { id }, select: profileSelect });
    },

    updateName(id: string, name: string | null): Promise<Profile> {
      return prisma.userProfile.update({ where: { id }, data: { name }, select: profileSelect });
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
