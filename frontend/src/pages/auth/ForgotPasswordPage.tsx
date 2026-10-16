import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FormMessage, TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { authErrorMessage } from '@/features/auth/errors';
import { type ForgotPasswordValues, forgotPasswordSchema } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit({ email }: ForgotPasswordValues) {
    setFormError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    // Limite de envio é o único erro mostrado. Para qualquer outro caso a
    // mensagem é a mesma, exista a conta ou não: assim ninguém usa esta tela
    // para descobrir quais e-mails estão cadastrados.
    if (error?.code === 'over_email_send_rate_limit') {
      setFormError(authErrorMessage(error));
      return;
    }
    setSentTo(email);
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      description="Informe o e-mail da sua conta para receber um link de redefinição."
      footer={
        <p>
          <Link to="/entrar" className="text-ink underline underline-offset-4 hover:text-accent">
            Voltar para o login
          </Link>
        </p>
      }
    >
      {sentTo ? (
        <FormMessage tone="success">
          Se existir uma conta com {sentTo}, você vai receber um e-mail com o link para criar uma
          nova senha. Confira também a caixa de spam.
        </FormMessage>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {formError && <FormMessage>{formError}</FormMessage>}
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
