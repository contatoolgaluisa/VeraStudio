import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { FormMessage, TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useProfile, useUpdateName } from '@/features/auth/profile';
import { type ProfileValues, profileSchema } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';

const memberSince = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

export function AccountPage() {
  const profile = useProfile();
  const updateName = useUpdateName();
  const [params] = useSearchParams();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });

  // Preenche o formulário quando o perfil chega da API.
  useEffect(() => {
    if (profile.data) reset({ name: profile.data.name ?? '' });
  }, [profile.data, reset]);

  if (profile.isPending) {
    return (
      <p role="status" className="mx-auto max-w-3xl px-4 py-24 text-muted sm:px-6">
        Carregando sua conta…
      </p>
    );
  }

  if (profile.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <StatusMessage
          role="alert"
          title="Não foi possível carregar sua conta"
          action={<Button onClick={() => void profile.refetch()}>Tentar novamente</Button>}
        >
          {profile.error.message}
        </StatusMessage>
      </div>
    );
  }

  const { data } = profile;

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Minha conta</h1>
      <p className="mt-3 text-muted">
        {data.email} · cliente desde {memberSince.format(new Date(data.createdAt))}
      </p>

      {params.get('senha') === 'alterada' && (
        <div className="mt-8">
          <FormMessage tone="success">Senha alterada com sucesso.</FormMessage>
        </div>
      )}

      {data.role === 'ADMIN' && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-line p-5">
          <p className="text-sm">Você tem acesso de administração.</p>
          <Link to="/admin" className="text-sm underline underline-offset-4 hover:text-accent">
            Abrir o painel
          </Link>
        </div>
      )}

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <form
          onSubmit={handleSubmit(({ name }) => updateName.mutate(name))}
          noValidate
          className="space-y-5"
        >
          <h2 className="font-sans text-lg font-medium tracking-normal">Dados pessoais</h2>
          {updateName.isError && <FormMessage>{updateName.error.message}</FormMessage>}
          {updateName.isSuccess && !isDirty && (
            <FormMessage tone="success">Nome atualizado.</FormMessage>
          )}
          <TextField
            label="Nome"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Button type="submit" variant="secondary" disabled={!isDirty || updateName.isPending}>
            {updateName.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>

        <div>
          <h2 className="font-sans text-lg font-medium tracking-normal">Pedidos</h2>
          <p className="mt-3 text-sm text-muted">
            O histórico de pedidos chega na Fase 6, junto com o carrinho.
          </p>
        </div>
      </div>

      <div className="mt-16 border-t border-line pt-8">
        <Button variant="secondary" onClick={() => void supabase.auth.signOut()}>
          Sair da conta
        </Button>
      </div>
    </section>
  );
}
