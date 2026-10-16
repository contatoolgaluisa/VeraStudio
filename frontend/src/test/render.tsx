import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createQueryClient } from '@/app/query-client';
import { routes } from '@/app/routes';

/** Renderiza a aplicação inteira em uma rota, com cache novo e sem novas tentativas. */
export function renderRoute(path: string) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}
