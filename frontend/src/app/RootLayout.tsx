import { Link, Outlet } from 'react-router';
import { brand } from '@/config/brand';

/** Estrutura comum a todas as páginas: cabeçalho, conteúdo e rodapé. */
export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Atalho de acessibilidade: permite pular direto para o conteúdo via teclado */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link to="/" className="font-serif text-2xl tracking-[0.2em] uppercase">
            {brand.shortName}
          </Link>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
          {brand.name} é uma loja fictícia criada como projeto de portfólio. Nenhuma compra real é
          processada.
        </div>
      </footer>
    </div>
  );
}
