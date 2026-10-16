import { z } from 'zod';

/**
 * Variáveis de ambiente validadas na inicialização.
 *
 * Se algo estiver faltando ou com formato errado, o servidor nem sobe e
 * mostra exatamente qual variável corrigir. É melhor falhar cedo do que
 * descobrir em produção que a URL do banco estava vazia.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: 'DATABASE_URL deve ser uma URL postgresql://',
  }),
  CORS_ORIGINS: z
    .string()
    .min(1, 'Informe ao menos uma origem em CORS_ORIGINS')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url({ protocol: /^https?$/, error: 'Origem de CORS inválida' })).min(1)),
  SUPABASE_URL: z
    .url({ protocol: /^https?$/, error: 'SUPABASE_URL deve ser a Project URL do Supabase' })
    .transform((url) => url.replace(/\/+$/, '')),
  // Opcional: sem ela, o envio de fotos fica desativado com um aviso claro.
  SUPABASE_SECRET_KEY: z
    .string()
    .optional()
    .transform((key) => key?.trim() || null)
    .refine((key) => key === null || !key.startsWith('sb_publishable_'), {
      error: 'SUPABASE_SECRET_KEY recebeu a chave publishable. Use a secret key (sb_secret_...).',
    }),
  // Regra de frete demonstrativa (decisão D8): valor fixo, grátis acima de um mínimo.
  SHIPPING_FLAT_CENTS: z.coerce.number().int().min(0).max(100_000).default(1990),
  FREE_SHIPPING_MIN_CENTS: z.coerce.number().int().min(0).max(10_000_000).default(29900),
});

export type Env = z.infer<typeof envSchema>;

/** Configuração já interpretada que o restante da aplicação consome. */
export interface AppConfig {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  logLevel: Env['LOG_LEVEL'];
  databaseUrl: string;
  corsOrigins: string[];
  supabaseUrl: string;
  /** null quando não configurada (envio de fotos desativado). */
  supabaseSecretKey: string | null;
  /** Frete em centavos: valor fixo e mínimo do pedido para frete grátis. */
  shipping: ShippingRule;
}

export interface ShippingRule {
  flatCents: number;
  freeMinCents: number;
}

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Variáveis de ambiente inválidas:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

export function parseEnv(source: Record<string, string | undefined>): AppConfig {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    // Mostra o nome da variável e o problema, mas nunca o valor recebido
    // (ele pode conter senhas).
    const issues = result.error.issues.map((issue) => {
      const name = issue.path[0] ? String(issue.path[0]) : '(desconhecida)';
      return `${name}: ${issue.message}`;
    });
    throw new EnvValidationError(issues);
  }

  const env = result.data;
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    corsOrigins: env.CORS_ORIGINS,
    supabaseUrl: env.SUPABASE_URL,
    supabaseSecretKey: env.SUPABASE_SECRET_KEY,
    shipping: { flatCents: env.SHIPPING_FLAT_CENTS, freeMinCents: env.FREE_SHIPPING_MIN_CENTS },
  };
}
