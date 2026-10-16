import { brand } from '@/config/brand';
import { ApiStatus } from '@/features/system/ApiStatus';

/**
 * Página inicial PROVISÓRIA da Fase 2 (fundação).
 * Será substituída pela home da loja na fase de interface e catálogo.
 */
export function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-sm tracking-[0.2em] text-muted uppercase">Em construção · Fase 2</p>
      <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight sm:text-6xl">
        {brand.name}
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        A fundação do projeto está pronta. O catálogo, o carrinho e o checkout serão construídos nas
        próximas fases.
      </p>

      <div className="mt-12 max-w-xl">
        <h2 className="mb-3 text-sm font-medium tracking-wide uppercase">Status do sistema</h2>
        <ApiStatus />
      </div>
    </section>
  );
}
