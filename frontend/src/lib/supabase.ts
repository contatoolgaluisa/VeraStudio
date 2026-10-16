import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

/**
 * Cliente do Supabase usado SOMENTE para autenticação (cadastro, login,
 * sessão, recuperação de senha). Dados da loja passam sempre pela nossa API.
 *
 * - persistSession: a sessão sobrevive a recarregar a página;
 * - autoRefreshToken: renova o token antes de ele vencer;
 * - detectSessionInUrl: lê o link de recuperação de senha recebido por e-mail.
 */
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
