import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from './auth-context';
import { useProfile } from './profile';

function Loading({ label }: { label: string }) {
  return (
    <p role="status" className="mx-auto max-w-7xl px-4 py-24 text-muted sm:px-6 lg:px-10">
      {label}
    </p>
  );
}

/**
 * Páginas que exigem login. Sem sessão, manda para /entrar e volta depois.
 * (Conveniência de navegação: os dados em si são protegidos pela API.)
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <Loading label="Carregando sua sessão…" />;
  if (!session) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/entrar?redirect=${redirect}`} replace />;
  }
  return children;
}

/**
 * Páginas só para administradores. O papel vem da API (GET /me).
 * Esconder esta página NÃO é a proteção: as rotas administrativas do backend
 * conferem o papel em cada requisição.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const profile = useProfile();

  if (profile.isPending) return <Loading label="Verificando permissões…" />;
  if (profile.isError || profile.data.role !== 'ADMIN') {
    return (
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
        <div className="max-w-xl">
          <p className="text-sm text-muted">Erro 403</p>
          <h1 className="mt-2 text-5xl">Acesso restrito</h1>
          <p className="mt-4 text-lg text-muted">
            Esta área é exclusiva para a administração da loja.
          </p>
          <ButtonLink to="/conta" className="mt-8">
            Ir para minha conta
          </ButtonLink>
        </div>
      </section>
    );
  }
  return children;
}
