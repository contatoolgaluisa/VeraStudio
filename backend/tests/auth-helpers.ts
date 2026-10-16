import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createTokenVerifier } from '../src/modules/auth/token-verifier.js';

/**
 * Simula o Supabase Auth nos testes: um par de chaves gerado na hora.
 * Os tokens são assinados com a chave privada e verificados com a pública,
 * exatamente como em produção, mas sem depender da internet.
 */
export const TEST_SUPABASE_URL = 'https://projeto-teste.supabase.co';
export const TEST_ISSUER = `${TEST_SUPABASE_URL}/auth/v1`;

type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

const { publicKey, privateKey } = await generateKeyPair('ES256');
const publicJwk = { ...(await exportJWK(publicKey)), kid: 'chave-teste', alg: 'ES256' };

export const testTokenVerifier = createTokenVerifier({
  issuer: TEST_ISSUER,
  keys: createLocalJWKSet({ keys: [publicJwk] }),
});

export async function signToken(
  claims: { sub: string; email: string; [claim: string]: unknown },
  options: {
    issuer?: string;
    audience?: string;
    expiresIn?: string;
    key?: PrivateKey;
  } = {},
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'ES256', kid: 'chave-teste' })
    .setIssuer(options.issuer ?? TEST_ISSUER)
    .setAudience(options.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '1h')
    .sign(options.key ?? privateKey);
}

/** Um segundo par de chaves, para simular um token forjado. */
export async function foreignPrivateKey(): Promise<PrivateKey> {
  return (await generateKeyPair('ES256')).privateKey;
}
