import type { RouteObject } from 'react-router';
import { CatalogPage } from '@/pages/catalog/CatalogPage';
import { CreditsPage } from '@/pages/credits/CreditsPage';
import { ContactPage, PrivacyPage, ReturnsPage, ShippingPage } from '@/pages/info/pages';
import { HomePage } from '@/pages/home/HomePage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { UpcomingPage } from '@/pages/placeholder/UpcomingPage';
import { ProductPage } from '@/pages/product/ProductPage';
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
      { path: 'produto/:slug', element: <ProductPage /> },
      {
        path: 'carrinho',
        element: (
          <UpcomingPage
            title="Carrinho"
            description="O carrinho de compras será implementado na Fase 6 do projeto. Por enquanto, você pode navegar pelo catálogo."
          />
        ),
      },
      { path: 'contato', element: <ContactPage /> },
      { path: 'entrega', element: <ShippingPage /> },
      { path: 'trocas-e-devolucoes', element: <ReturnsPage /> },
      { path: 'privacidade', element: <PrivacyPage /> },
      { path: 'creditos', element: <CreditsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
