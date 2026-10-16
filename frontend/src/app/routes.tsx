import type { RouteObject } from 'react-router';
import { HomePage } from '@/pages/home/HomePage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { RootLayout } from './RootLayout';

/** Mapa de rotas da aplicação. Novas páginas entram aqui nas próximas fases. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
