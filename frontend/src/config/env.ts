import { z } from 'zod';

/**
 * Variáveis de ambiente do frontend, validadas ao carregar o app.
 * Lembre-se: tudo aqui é público (vai para o navegador).
 */
const schema = z.object({
  VITE_API_URL: z
    .url({ protocol: /^https?$/, error: 'VITE_API_URL deve ser uma URL http(s)' })
    .transform((url) => url.replace(/\/+$/, '')), // remove barra final
  VITE_SUPABASE_URL: z
    .url({ protocol: /^https?$/, error: 'VITE_SUPABASE_URL deve ser a Project URL do Supabase' })
    .transform((url) => url.replace(/\/+$/, '')),
  // Chave PÚBLICA do Supabase. A secret key nunca pode aparecer aqui.
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20, 'Informe a publishable key do Supabase')
    .refine((key) => !key.startsWith('sb_secret_'), {
      error: 'Isso é a SECRET key! Use a publishable key no frontend.',
    }),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join('\n');
  throw new Error(`Configuração inválida do frontend. Verifique o arquivo .env:\n${issues}`);
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL,
  supabaseUrl: parsed.data.VITE_SUPABASE_URL,
  supabasePublishableKey: parsed.data.VITE_SUPABASE_PUBLISHABLE_KEY,
};
