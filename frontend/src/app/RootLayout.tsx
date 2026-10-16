import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { Footer } from './layout/Footer';
import { Header } from './layout/Header';

/** Ao trocar de página, volta ao topo (o navegador não faz isso sozinho numa SPA). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Estrutura comum a todas as páginas: cabeçalho, conteúdo e rodapé.
 * O AuthProvider fica aqui para que toda página saiba quem está logado.
 */
export function RootLayout() {
  return (
    <AuthProvider>
      <div className="flex min-h-dvh flex-col">
        {/* Atalho de acessibilidade: permite pular direto para o conteúdo via teclado */}
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Pular para o conteúdo
        </a>
        <ScrollToTop />
        <Header />
        <main id="conteudo" className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
