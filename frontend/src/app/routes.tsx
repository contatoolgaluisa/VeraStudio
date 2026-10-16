import type { RouteObject } from 'react-router';
import { CatalogPage } from '@/pages/catalog/CatalogPage';
import { CreditsPage } from '@/pages/credits/CreditsPage';
import { HomePage } from '@/pages/home/HomePage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { UpcomingPage } from '@/pages/placeholder/UpcomingPage';
import { RootLayout } from './RootLayout';

/** Mapa de rotas da aplicação. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'loja', element: <CatalogPage key="all" variant="all" /> },
      { path: 'loja/:categoria', element: <CatalogPage key="category" variant="category" /> },
      { path: 'novidades', element: <CatalogPage key="new" variant="new" /> },
      { path: 'promocoes', element: <CatalogPage key="sale" variant="sale" /> },
      { path: 'busca', element: <CatalogPage key="search" variant="search" /> },
      {
        path: 'produto/:slug',
        element: (
          <UpcomingPage
            title="Detalhes do produto"
            description="A página do produto, com fotos, seleção de cor e tamanho, está em construção e chega na próxima entrega (Fase 4B)."
          />
        ),
      },
      {
        path: 'carrinho',
        element: (
          <UpcomingPage
            title="Carrinho"
            description="O carrinho de compras será implementado na Fase 6 do projeto. Por enquanto, você pode navegar pelo catálogo."
          />
        ),
      },
      { path: 'creditos', element: <CreditsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
