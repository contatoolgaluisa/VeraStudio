import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { FormMessage, TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/auth-context';
import { authErrorMessage } from '@/features/auth/errors';
import { type ResetPasswordValues, resetPasswordSchema } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { AuthLayout } from './AuthLayout';

/**
 * Destino do link enviado por e-mail. O Supabase lê o código do link,
 * cria uma sessão temporária e aí a pessoa define a nova senha.
 */
export function ResetPasswordPage() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  if (!ready) {
    return (
      <AuthLayout title="Redefinir senha">
        <p role="status" className="text-muted">
          Verificando o link…
        </p>
      </AuthLayout>
    );
  }

  if (!session) {
    return (
      <AuthLayout title="Link inválido ou expirado">
        <p className="text-muted">
          Os links de redefinição valem por pouco tempo e só podem ser usados uma vez.{' '}
          <Link
            to="/recuperar-senha"
            className="text-ink underline underline-offset-4 hover:text-accent"
          >
            Peça um novo link
          </Link>
          .
        </p>
      </AuthLayout>
    );
  }

  async function onSubmit({ password }: ResetPasswordValues) {
    setFormError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    await navigate('/conta?senha=alterada', { replace: true });
  }

  return (
    <AuthLayout title="Redefinir senha" description="Escolha uma nova senha para sua conta.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <FormMessage>{formError}</FormMessage>}
        <TextField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirme a nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthLayout>
  );
}
