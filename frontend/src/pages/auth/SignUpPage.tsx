import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { FormMessage, TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/auth-context';
import { authErrorMessage, safeRedirect } from '@/features/auth/errors';
import { type SignUpValues, signUpSchema } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { AuthLayout } from './AuthLayout';

export function SignUpPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = safeRedirect(params.get('redirect'));
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  if (session) return <Navigate to={redirectTo} replace />;

  async function onSubmit(values: SignUpValues) {
    setFormError(null);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // O nome vai para os metadados do usuário. Nenhum papel é enviado:
        // a conta nasce como cliente, e só o servidor concede ADMIN.
        data: { name: values.name.trim() },
        emailRedirectTo: `${window.location.origin}/entrar`,
      },
    });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    // Com confirmação de e-mail ligada no Supabase, não há sessão até a pessoa
    // clicar no link. Sem confirmação, a sessão já vem pronta.
    if (!data.session) {
      setConfirmationSentTo(values.email);
      return;
    }
    await navigate(redirectTo, { replace: true });
  }

  if (confirmationSentTo) {
    return (
      <AuthLayout title="Confirme seu e-mail">
        <FormMessage tone="success">
          Enviamos um link de confirmação para {confirmationSentTo}. Abra o e-mail e clique no link
          para ativar a conta.
        </FormMessage>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Criar conta"
      description="Leva menos de um minuto."
      footer={
        <p>
          Já tem conta?{' '}
          <Link
            to={`/entrar?redirect=${encodeURIComponent(redirectTo)}`}
            className="text-ink underline underline-offset-4 hover:text-accent"
          >
            Entrar
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <FormMessage>{formError}</FormMessage>}
        <TextField
          label="Nome"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirme a senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthLayout>
  );
}
