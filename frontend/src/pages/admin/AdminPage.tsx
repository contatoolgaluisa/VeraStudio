import { ButtonLink } from '@/components/ui/Button';

/**
 * Entrada do painel administrativo. Por enquanto só confirma o acesso:
 * o dashboard e a gestão de produtos chegam na Fase 5B.
 */
export function AdminPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
      <div className="max-w-xl">
        <h1 className="text-5xl">Painel administrativo</h1>
        <p className="mt-4 text-lg text-muted">
          Seu acesso de administração está ativo. O dashboard, a gestão de produtos, estoque e
          categorias chegam na próxima entrega (Fase 5B).
        </p>
        <ButtonLink to="/conta" variant="secondary" className="mt-8">
          Voltar para minha conta
        </ButtonLink>
      </div>
    </section>
  );
}
