import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { FormMessage, TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/auth-context';
import { authErrorMessage, safeRedirect } from '@/features/auth/errors';
import { type LoginValues, loginSchema } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { AuthLayout } from './AuthLayout';

const linkClass = 'text-ink underline underline-offset-4 hover:text-accent';

export function LoginPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = safeRedirect(params.get('redirect'));
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  // Já logado (ex.: abriu /entrar em outra aba): segue direto.
  if (session) return <Navigate to={redirectTo} replace />;

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    await navigate(redirectTo, { replace: true });
  }

  return (
    <AuthLayout
      title="Entrar"
      description="Acesse sua conta para acompanhar seus pedidos."
      footer={
        <>
          <p>
            Ainda não tem conta?{' '}
            <Link to={`/cadastro?redirect=${encodeURIComponent(redirectTo)}`} className={linkClass}>
              Criar conta
            </Link>
          </p>
          <p>
            <Link to="/recuperar-senha" className={linkClass}>
              Esqueci minha senha
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <FormMessage>{formError}</FormMessage>}
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  );
}
