import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  categories,
  filterOptions,
  makeProduct,
  mockApi,
  productList,
} from '@/test/fixtures';
import { createQueryClient } from './query-client';
import { routes } from './routes';

function renderAt(path: string) {
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

/** Lista as URLs chamadas em /catalog/products. */
function productRequests(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname === '/catalog/products');
}

const vestido = makeProduct({ id: 'a', slug: 'vestido-linho', name: 'Vestido Linho', isNew: true });
const camisa = makeProduct({
  id: 'b',
  slug: 'camisa-popeline',
  name: 'Camisa Popeline',
  priceCents: 12900,
  compareAtPriceCents: 15900,
  isOnSale: true,
  discountPercent: 19,
});

const defaultHandlers = {
  '/catalog/products': () => productList([vestido, camisa]),
  '/catalog/categories': () => ({ data: categories }),
  '/catalog/filters': () => ({ data: filterOptions }),
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('home', () => {
  it('mostra o destaque e as vitrines de novidades e promoções com dados da API', async () => {
    const fetchMock = mockApi(defaultHandlers);
    renderAt('/');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Peças que atravessam estações.' }),
    ).toBeTruthy();
    const novidades = await screen.findByRole('region', { name: 'Novidades' });
    expect(within(novidades).getByRole('link', { name: 'Vestido Linho' })).toBeTruthy();

    const requests = productRequests(fetchMock);
    expect(requests.some((url) => url.searchParams.get('isNew') === 'true')).toBe(true);
    expect(requests.some((url) => url.searchParams.get('onSale') === 'true')).toBe(true);
  });
});

describe('catálogo', () => {
  it('lista os produtos da categoria com nome, preço e contagem', async () => {
    const fetchMock = mockApi(defaultHandlers);
    renderAt('/loja/feminino');

    expect(await screen.findByRole('heading', { level: 1, name: 'Feminino' })).toBeTruthy();
    expect(await screen.findByText('2 produtos')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Vestido Linho' }).getAttribute('href')).toBe(
      '/produto/vestido-linho',
    );
    expect(productRequests(fetchMock)[0]?.searchParams.get('category')).toBe('feminino');
  });

  it('mostra preço promocional com o preço anterior riscado e o desconto', async () => {
    mockApi(defaultHandlers);
    renderAt('/promocoes');

    const card = (await screen.findByRole('link', { name: 'Camisa Popeline' })).closest('article');
    expect(card).toBeTruthy();
    const scope = within(card as HTMLElement);
    expect(scope.getByText('−19%')).toBeTruthy();
    expect(scope.getByText(/R\$\s?159,00/)).toBeTruthy();
    expect(scope.getByText(/R\$\s?129,00/)).toBeTruthy();
  });

  it('aplica filtro de tamanho na URL e na consulta à API', async () => {
    const fetchMock = mockApi(defaultHandlers);
    const router = renderAt('/loja');

    fireEvent.click(await screen.findByRole('checkbox', { name: 'M' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?tamanhos=M');
    });
    await waitFor(() => {
      const last = productRequests(fetchMock).at(-1);
      expect(last?.searchParams.get('sizes')).toBe('M');
    });
  });

  it('converte o filtro de preço de reais (tela) para centavos (API)', async () => {
    const fetchMock = mockApi(defaultHandlers);
    renderAt('/loja');

    fireEvent.change(await screen.findByLabelText('Mínimo'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Máximo'), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar preço' }));

    await waitFor(() => {
      const last = productRequests(fetchMock).at(-1);
      expect(last?.searchParams.get('minPrice')).toBe('10000');
      expect(last?.searchParams.get('maxPrice')).toBe('30000');
    });
  });

  it('recusa faixa de preço invertida com mensagem clara', async () => {
    mockApi(defaultHandlers);
    renderAt('/loja');

    fireEvent.change(await screen.findByLabelText('Mínimo'), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText('Máximo'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar preço' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'O preço mínimo precisa ser menor que o máximo.',
    );
  });

  it('mostra estado vazio com opção de limpar os filtros', async () => {
    mockApi({ ...defaultHandlers, '/catalog/products': () => productList([]) });
    const router = renderAt('/loja?tamanhos=GG');

    expect(await screen.findByRole('heading', { name: 'Nenhum produto encontrado' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('mostra erro com opção de tentar novamente quando a API falha', async () => {
    mockApi({
      ...defaultHandlers,
      '/catalog/products': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderAt('/loja');

    expect(
      await screen.findByRole('heading', { name: 'Não foi possível carregar os produtos' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });

  it('responde 404 para categoria inexistente', async () => {
    mockApi(defaultHandlers);
    renderAt('/loja/sapatos');

    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeTruthy();
  });

  it('busca pelo termo da URL', async () => {
    const fetchMock = mockApi(defaultHandlers);
    renderAt('/busca?q=linho');

    expect(screen.getByRole('heading', { level: 1, name: 'Resultados para “linho”' })).toBeTruthy();
    await waitFor(() => {
      expect(productRequests(fetchMock)[0]?.searchParams.get('q')).toBe('linho');
    });
  });
});

describe('navegação', () => {
  it('abre o menu do celular como diálogo e fecha com Esc', async () => {
    mockApi(defaultHandlers);
    renderAt('/');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(dialog).getByRole('link', { name: 'Promoções' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('avisa que o carrinho ainda não foi implementado, em vez de fingir', () => {
    mockApi(defaultHandlers);
    renderAt('/carrinho');

    expect(screen.getByText(/será implementado na Fase 6/)).toBeTruthy();
  });

  it('exibe a página 404 para rotas desconhecidas', () => {
    mockApi(defaultHandlers);
    renderAt('/rota-que-nao-existe');

    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeTruthy();
  });
});
