import { ButtonLink } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10">
      <div className="max-w-xl">
        <p className="text-sm text-muted">Erro 404</p>
        <h1 className="mt-2 text-5xl">Página não encontrada</h1>
        <p className="mt-4 text-lg text-muted">
          O endereço pode estar incorreto ou a página foi removida.
        </p>
        <ButtonLink to="/loja" className="mt-8">
          Ir para a loja
        </ButtonLink>
      </div>
    </section>
  );
}
