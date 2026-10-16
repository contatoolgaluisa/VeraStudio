import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseEnv } from '../src/config/env.js';

const valid = {
  DATABASE_URL: 'postgresql://vera:segredo123@localhost:5432/vera_studio',
  CORS_ORIGINS: 'http://localhost:5173, https://vera-studio.vercel.app',
  SUPABASE_URL: 'https://exemplo.supabase.co/',
};

describe('parseEnv', () => {
  it('aplica valores padrão e interpreta a lista de origens', () => {
    const config = parseEnv(valid);

    expect(config.port).toBe(3333);
    expect(config.nodeEnv).toBe('development');
    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'https://vera-studio.vercel.app']);
  });

  it('remove a barra final da URL do Supabase', () => {
    expect(parseEnv(valid).supabaseUrl).toBe('https://exemplo.supabase.co');
  });

  it('usa a regra de frete padrão e aceita outra pelo ambiente', () => {
    expect(parseEnv(valid).shipping).toEqual({ flatCents: 1990, freeMinCents: 29900 });
    expect(
      parseEnv({ ...valid, SHIPPING_FLAT_CENTS: '0', FREE_SHIPPING_MIN_CENTS: '15000' }).shipping,
    ).toEqual({ flatCents: 0, freeMinCents: 15000 });
  });

  it('trata a secret key do Supabase como opcional', () => {
    expect(parseEnv(valid).supabaseSecretKey).toBeNull();
    expect(parseEnv({ ...valid, SUPABASE_SECRET_KEY: 'sb_secret_abc' }).supabaseSecretKey).toBe(
      'sb_secret_abc',
    );
  });

  it('recusa a chave publishable no lugar da secret key', () => {
    expect(() => parseEnv({ ...valid, SUPABASE_SECRET_KEY: 'sb_publishable_abc' })).toThrow(
      /SUPABASE_SECRET_KEY/,
    );
  });

  it('converte PORT de texto para número', () => {
    expect(parseEnv({ ...valid, PORT: '8080' }).port).toBe(8080);
  });

  it('falha com mensagem clara quando falta DATABASE_URL', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(EnvValidationError);
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it('rejeita URL de banco que não seja PostgreSQL', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: 'mysql://user:pass@localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('nunca inclui o valor das variáveis (que pode ter senha) na mensagem de erro', () => {
    try {
      parseEnv({ ...valid, DATABASE_URL: 'mysql://user:segredo123@localhost/db' });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain('segredo123');
    }
  });
});
