import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseEnv } from '../src/config/env.js';

const valid = {
  DATABASE_URL: 'postgresql://vera:segredo123@localhost:5432/vera_studio',
  CORS_ORIGINS: 'http://localhost:5173, https://vera-studio.vercel.app',
};

describe('parseEnv', () => {
  it('aplica valores padrão e interpreta a lista de origens', () => {
    const config = parseEnv(valid);

    expect(config.port).toBe(3333);
    expect(config.nodeEnv).toBe('development');
    expect(config.corsOrigins).toEqual([
      'http://localhost:5173',
      'https://vera-studio.vercel.app',
    ]);
  });

  it('converte PORT de texto para número', () => {
    expect(parseEnv({ ...valid, PORT: '8080' }).port).toBe(8080);
  });

  it('falha com mensagem clara quando falta DATABASE_URL', () => {
    expect(() => parseEnv({ CORS_ORIGINS: valid.CORS_ORIGINS })).toThrow(EnvValidationError);
    expect(() => parseEnv({ CORS_ORIGINS: valid.CORS_ORIGINS })).toThrow(/DATABASE_URL/);
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
