import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import { AppError } from '../../lib/errors.js';

/**
 * Verificação do token de login emitido pelo Supabase Auth.
 *
 * O Supabase assina cada token (JWT) com uma chave PRIVADA que só ele tem.
 * O backend baixa a chave PÚBLICA correspondente (JWKS) e confere a
 * assinatura localmente: se alguém alterar qualquer parte do token, a
 * conferência falha. Nenhum segredo precisa ficar no servidor.
 *
 * Além da assinatura, conferimos:
 * - iss (emissor): o token veio do NOSSO projeto Supabase;
 * - aud (público): é um token de usuário logado ("authenticated");
 * - exp (validade): o jose rejeita tokens vencidos automaticamente.
 */

export interface VerifiedToken {
  /** id do usuário no Supabase (claim `sub`) */
  userId: string;
  email: string;
  /** Nome informado no cadastro, se houver. Usado só para criar o perfil. */
  name: string | null;
}

export type TokenVerifier = (token: string) => Promise<VerifiedToken>;

export function createTokenVerifier(options: {
  issuer: string;
  keys: JWTVerifyGetKey;
}): TokenVerifier {
  return async (token) => {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, options.keys, {
        issuer: options.issuer,
        audience: 'authenticated',
      }));
    } catch {
      // Não revelamos o motivo exato (assinatura, validade, emissor...).
      throw AppError.unauthenticated('Sessão inválida ou expirada. Faça login novamente.');
    }

    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!payload.sub || !email) {
      throw AppError.unauthenticated('Sessão inválida ou expirada. Faça login novamente.');
    }

    // `user_metadata` é editável pelo próprio usuário: serve para o nome,
    // NUNCA para permissões.
    const metadata = payload.user_metadata as { name?: unknown } | undefined;
    const name = typeof metadata?.name === 'string' ? metadata.name.trim().slice(0, 80) : '';

    return { userId: payload.sub, email: email.toLowerCase(), name: name || null };
  };
}

/** Verificador de produção: chaves públicas baixadas (e guardadas em cache) do Supabase. */
export function createSupabaseTokenVerifier(supabaseUrl: string): TokenVerifier {
  const authUrl = `${supabaseUrl}/auth/v1`;
  return createTokenVerifier({
    issuer: authUrl,
    keys: createRemoteJWKSet(new URL(`${authUrl}/.well-known/jwks.json`)),
  });
}
