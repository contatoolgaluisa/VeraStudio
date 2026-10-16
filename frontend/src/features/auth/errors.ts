/**
 * Traduz os erros do Supabase Auth para mensagens claras em português.
 * Códigos: https://supabase.com/docs/guides/auth/debugging/error-codes
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  user_already_exists: 'Já existe uma conta com este e-mail. Entre ou recupere a senha.',
  email_exists: 'Já existe uma conta com este e-mail. Entre ou recupere a senha.',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  over_email_send_rate_limit:
    'Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
  signup_disabled: 'Novos cadastros estão desativados no momento.',
};

export function authErrorMessage(error: { code?: string; message?: string } | null): string {
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code] as string;
  return 'Não foi possível concluir agora. Verifique sua conexão e tente de novo.';
}

/** Aceita só caminhos internos no ?redirect= (evita mandar a pessoa para outro site). */
export function safeRedirect(value: string | null, fallback = '/conta'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}
