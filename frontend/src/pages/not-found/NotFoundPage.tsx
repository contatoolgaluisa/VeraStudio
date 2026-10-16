import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
      <p className="text-sm tracking-[0.2em] text-muted uppercase">Erro 404</p>
      <h1 className="mt-4 font-serif text-4xl">Página não encontrada</h1>
      <p className="mt-4 text-muted">O endereço pode estar incorreto ou a página foi removida.</p>
      <Link to="/" className="mt-8 inline-block border-b border-ink pb-0.5">
        Voltar para o início
      </Link>
    </section>
  );
}
