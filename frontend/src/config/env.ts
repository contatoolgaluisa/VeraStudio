import { z } from 'zod';

/**
 * Variáveis de ambiente do frontend, validadas ao carregar o app.
 * Lembre-se: tudo aqui é público (vai para o navegador).
 */
const schema = z.object({
  VITE_API_URL: z
    .url({ protocol: /^https?$/, error: 'VITE_API_URL deve ser uma URL http(s)' })
    .transform((url) => url.replace(/\/+$/, '')), // remove barra final
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join('\n');
  throw new Error(`Configuração inválida do frontend. Verifique o arquivo .env:\n${issues}`);
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL,
};
