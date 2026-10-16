import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createQueryClient } from './query-client';
import { routes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('aplicação', () => {
  it('mostra que API e banco respondem quando /health/ready retorna ok', async () => {
    const fetchMock = mockFetch(async () =>
      Response.json({ status: 'ok', database: 'up' }, { status: 200 }),
    );

    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: 'VÉRA Studio' })).toBeTruthy();
    expect(await screen.findByText('API e banco de dados respondendo')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3333/health/ready',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('mostra erro e botão para tentar novamente quando a API está fora do ar', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    renderAt('/');

    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });

  it('exibe a página 404 para rotas desconhecidas', () => {
    mockFetch(async () => Response.json({}));

    renderAt('/rota-que-nao-existe');

    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeTruthy();
  });
});
