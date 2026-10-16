import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminCategory, AdminProduct, DashboardSummary } from '@/features/admin/types';
import { setFakeSession } from '@/test/fake-supabase';
import { mockApi } from '@/test/fixtures';
import { renderRoute } from '@/test/render';

const PRODUCT_ID = '0192f1a0-0000-7000-8000-000000000001';

const me = {
  data: {
    id: 'u-admin',
    email: 'admin@exemplo.com',
    name: 'Admin',
    role: 'ADMIN',
    createdAt: '2026-10-01T12:00:00.000Z',
  },
};

const categoriesData: AdminCategory[] = [
  {
    id: 'cat-1',
    name: 'Feminino',
    slug: 'feminino',
    description: null,
    sortOrder: 1,
    _count: { products: 3 },
  },
  {
    id: 'cat-2',
    name: 'Calçados',
    slug: 'calcados',
    description: null,
    sortOrder: 2,
    _count: { products: 0 },
  },
];

function makeAdminProduct(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    id: PRODUCT_ID,
    name: 'Camiseta Essential',
    slug: 'camiseta-essential',
    description: 'Camiseta de algodão para os testes.',
    priceCents: 12990,
    compareAtPriceCents: null,
    status: 'DRAFT',
    isNew: false,
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    category: { id: 'cat-1', name: 'Feminino', slug: 'feminino' },
    images: [],
    variants: [
      {
        id: 'var-1',
        sku: 'VS-CAM-PRE-M',
        color: 'Preto',
        colorHex: '#151515',
        size: 'M',
        stock: 4,
        isActive: true,
      },
    ],
    ...overrides,
  };
}

function loginAsAdmin() {
  setFakeSession({
    access_token: 'token-admin',
    user: { id: 'u-admin', email: 'admin@exemplo.com' },
  });
}

function body(init: RequestInit | undefined) {
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

function apiError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('visão geral', () => {
  it('mostra os números da API e não inventa pedidos', async () => {
    const summary: DashboardSummary = {
      products: { total: 24, published: 20, draft: 3, archived: 1 },
      stock: { threshold: 3, lowStock: 2, outOfStock: 1 },
      lowStockItems: [
        {
          sku: 'VS-CAM-PRE-P',
          color: 'Preto',
          size: 'P',
          stock: 0,
          product: { id: PRODUCT_ID, name: 'Camiseta Essential' },
        },
      ],
      orders: null,
    };
    const fetchMock = mockApi({ '/me': () => me, '/admin/dashboard': () => ({ data: summary }) });
    loginAsAdmin();
    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeTruthy();
    expect(screen.getByText('Publicados').nextElementSibling?.textContent).toBe('20');
    expect(screen.getByText(/disponíveis|aparecem aqui a partir da Fase 6/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Camiseta Essential' }).getAttribute('href')).toBe(
      `/admin/produtos/${PRODUCT_ID}`,
    );
    expect(screen.getByText('Esgotado')).toBeTruthy();

    // A chamada leva o token: quem confere a permissão é o backend.
    const [, init] = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/admin/dashboard'),
    )!;
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-admin');
  });
});

describe('lista de produtos', () => {
  it('busca pela URL e mostra estado vazio', async () => {
    const fetchMock = mockApi({
      '/me': () => me,
      '/admin/products': (url) => ({
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0, q: url.searchParams.get('q') },
      }),
    });
    loginAsAdmin();
    const router = renderRoute('/admin/produtos');

    fireEvent.change(await screen.findByLabelText('Buscar por nome ou SKU'), {
      target: { value: 'vs-cam' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText(/Nenhum produto corresponde/)).toBeTruthy();
    expect(router.state.location.search).toBe('?q=vs-cam');
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('/admin/products?') && url.includes('q=vs-cam'))).toBe(
      true,
    );
  });
});

describe('novo produto', () => {
  it('valida no navegador, envia centavos e abre a edição', async () => {
    let sent: Record<string, unknown> | null = null;
    mockApi({
      '/me': () => me,
      '/admin/categories': () => ({ data: categoriesData }),
      '/admin/products': (_url, init) => {
        sent = body(init);
        return Response.json({ data: makeAdminProduct() }, { status: 201 });
      },
      [`/admin/products/${PRODUCT_ID}`]: () => ({ data: makeAdminProduct() }),
    });
    loginAsAdmin();
    const router = renderRoute('/admin/produtos/novo');

    await screen.findByRole('option', { name: 'Feminino' });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Camiseta Essential' } });
    fireEvent.change(screen.getByLabelText('Descrição'), {
      target: { value: 'Camiseta de algodão para os testes.' },
    });
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'cat-1' } });
    fireEvent.change(screen.getByLabelText('Preço de venda (R$)'), { target: { value: '12.9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    expect(await screen.findByText('Informe o preço, por exemplo 129,90')).toBeTruthy();
    expect(sent).toBeNull();

    fireEvent.change(screen.getByLabelText('Preço de venda (R$)'), { target: { value: '129,90' } });
    fireEvent.change(screen.getByLabelText('Preço "de" (R$, opcional)'), {
      target: { value: '100' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(
      await screen.findByText('O preço "de" precisa ser maior que o preço de venda'),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Preço "de" (R$, opcional)'), {
      target: { value: '159,90' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/admin/produtos/${PRODUCT_ID}`),
    );
    expect(sent).toEqual({
      name: 'Camiseta Essential',
      description: 'Camiseta de algodão para os testes.',
      categoryId: 'cat-1',
      priceCents: 12990,
      compareAtPriceCents: 15990,
      isNew: false,
    });
    expect(await screen.findByText(/Rascunho criado/)).toBeTruthy();
  });
});

describe('edição de produto', () => {
  function mockEditor(handlers: Parameters<typeof mockApi>[0] = {}) {
    return mockApi({
      '/me': () => me,
      '/admin/categories': () => ({ data: categoriesData }),
      [`/admin/products/${PRODUCT_ID}`]: () => ({ data: makeAdminProduct() }),
      ...handlers,
    });
  }

  it('ajusta o estoque de forma relativa e mostra a recusa do servidor', async () => {
    const deltas: unknown[] = [];
    mockEditor({
      '/admin/variants/var-1': (_url, init) => {
        const { stockDelta } = body(init);
        deltas.push(stockDelta);
        if (Number(stockDelta) < -4) {
          return apiError(409, 'INSUFFICIENT_STOCK', 'O ajuste deixaria o estoque negativo.');
        }
        return { data: makeAdminProduct() };
      },
    });
    loginAsAdmin();
    renderRoute(`/admin/produtos/${PRODUCT_ID}`);

    const input = await screen.findByLabelText('Ajuste de estoque de Preto M');
    const row = input.closest('tr')!;

    fireEvent.change(input, { target: { value: 'dois' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Aplicar' }));
    expect(await within(row).findByText('Use um número como +5 ou -2.')).toBeTruthy();
    expect(deltas).toEqual([]);

    fireEvent.change(input, { target: { value: '-9' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Aplicar' }));
    expect(await within(row).findByText('O ajuste deixaria o estoque negativo.')).toBeTruthy();

    fireEvent.change(input, { target: { value: '+5' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(deltas).toEqual([-9, 5]));
  });

  it('mostra por que o produto não pôde ser publicado', async () => {
    mockEditor({
      [`/admin/products/${PRODUCT_ID}`]: (_url, init) =>
        init?.method === 'PATCH'
          ? apiError(
              422,
              'CANNOT_PUBLISH',
              'Cadastre ao menos uma variação ativa antes de publicar.',
            )
          : { data: makeAdminProduct({ variants: [] }) },
    });
    loginAsAdmin();
    renderRoute(`/admin/produtos/${PRODUCT_ID}`);

    expect(await screen.findByText(/Nenhuma variação cadastrada/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar na loja' }));

    expect(
      await screen.findByText('Cadastre ao menos uma variação ativa antes de publicar.'),
    ).toBeTruthy();
  });

  it('envia a foto em três passos: link, Storage e cadastro', async () => {
    const calls: string[] = [];
    let registered: Record<string, unknown> | null = null;
    mockEditor({
      [`/admin/products/${PRODUCT_ID}/images/upload-url`]: (_url, init) => {
        calls.push(`link ${String(body(init).contentType)}`);
        return {
          data: {
            path: `products/${PRODUCT_ID}/abc.webp`,
            uploadUrl: 'https://projeto-teste.supabase.co/storage-upload',
          },
        };
      },
      '/storage-upload': (_url, init) => {
        calls.push(
          `storage ${init?.method} ${(init?.headers as Record<string, string>)['Content-Type']}`,
        );
        return { Key: 'ok' };
      },
      [`/admin/products/${PRODUCT_ID}/images`]: (_url, init) => {
        calls.push('cadastro');
        registered = body(init);
        return Response.json(
          {
            data: {
              id: 'img-1',
              url: 'https://x/abc.webp',
              alt: 'Frente',
              color: 'Preto',
              position: 0,
            },
          },
          { status: 201 },
        );
      },
    });
    loginAsAdmin();
    renderRoute(`/admin/produtos/${PRODUCT_ID}`);

    const fileInput = await screen.findByLabelText('Arquivo');
    const send = screen.getByRole('button', { name: 'Enviar foto' });

    // Tipo errado: barrado antes de qualquer chamada.
    fireEvent.change(fileInput, {
      target: { files: [new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })] },
    });
    fireEvent.click(send);
    expect(await screen.findByText('Envie uma imagem JPG, PNG ou WebP.')).toBeTruthy();
    expect(calls).toEqual([]);

    fireEvent.change(fileInput, {
      target: { files: [new File(['webp'], 'frente.webp', { type: 'image/webp' })] },
    });
    fireEvent.change(screen.getByLabelText('Descrição (texto alternativo)'), {
      target: { value: 'Camiseta preta de frente' },
    });
    fireEvent.change(screen.getByLabelText('Cor mostrada'), { target: { value: 'Preto' } });
    fireEvent.click(send);

    await waitFor(() =>
      expect(calls).toEqual(['link image/webp', 'storage PUT image/webp', 'cadastro']),
    );
    expect(registered).toEqual({
      path: `products/${PRODUCT_ID}/abc.webp`,
      alt: 'Camiseta preta de frente',
      color: 'Preto',
    });
  });

  it('avisa quando o envio de fotos ainda não foi configurado', async () => {
    mockEditor({
      [`/admin/products/${PRODUCT_ID}/images/upload-url`]: () =>
        apiError(503, 'STORAGE_NOT_CONFIGURED', 'Envio de fotos pendente de configuração.'),
    });
    loginAsAdmin();
    renderRoute(`/admin/produtos/${PRODUCT_ID}`);

    fireEvent.change(await screen.findByLabelText('Arquivo'), {
      target: { files: [new File(['jpg'], 'a.jpg', { type: 'image/jpeg' })] },
    });
    fireEvent.change(screen.getByLabelText('Descrição (texto alternativo)'), {
      target: { value: 'Foto de teste' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar foto' }));

    expect(await screen.findByText('Envio de fotos pendente de configuração.')).toBeTruthy();
  });
});

describe('categorias', () => {
  it('só deixa excluir categoria sem produtos e cria com ordem numérica', async () => {
    let created: Record<string, unknown> | null = null;
    const deleted: string[] = [];
    mockApi({
      '/me': () => me,
      '/admin/categories': (_url, init) => {
        if (init?.method === 'POST') {
          created = body(init);
          return Response.json({ data: { id: 'cat-3' } }, { status: 201 });
        }
        return { data: categoriesData };
      },
      '/admin/categories/cat-2': () => {
        deleted.push('cat-2');
        return new Response(null, { status: 204 });
      },
    });
    loginAsAdmin();
    renderRoute('/admin/categorias');

    const withProducts = await screen.findByRole('button', { name: 'Excluir Feminino' });
    expect((withProducts as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Calçados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    await waitFor(() => expect(deleted).toEqual(['cat-2']));

    const form = screen.getByRole('form', { name: 'Nova categoria' });
    fireEvent.change(within(form).getByLabelText('Nome'), { target: { value: 'Calçados' } });
    fireEvent.change(within(form).getByLabelText('Ordem no menu'), { target: { value: '5' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Criar categoria' }));

    await waitFor(() =>
      expect(created).toEqual({ name: 'Calçados', description: null, sortOrder: 5 }),
    );
  });
});
