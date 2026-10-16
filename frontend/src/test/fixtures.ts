import { vi } from 'vitest';
import type { Category, FilterOptions, ProductSummary } from '@/features/catalog/types';

export function makeProduct(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: overrides.slug ?? 'p1',
    slug: 'vestido-teste',
    name: 'Vestido Teste',
    category: { slug: 'feminino', name: 'Feminino' },
    priceCents: 38900,
    compareAtPriceCents: null,
    isOnSale: false,
    discountPercent: null,
    isNew: false,
    image: null,
    colors: [{ name: 'Preto', hex: '#151515' }],
    sizes: ['P', 'M'],
    inStock: true,
    ...overrides,
  };
}

export const categories: Category[] = [
  {
    id: 'c1',
    slug: 'feminino',
    name: 'Feminino',
    description: 'Peças femininas.',
    productCount: 2,
  },
  { id: 'c2', slug: 'masculino', name: 'Masculino', description: null, productCount: 1 },
];

export const filterOptions: FilterOptions = {
  colors: [
    { name: 'Areia', hex: '#D8C8A8' },
    { name: 'Preto', hex: '#151515' },
  ],
  sizes: ['P', 'M', 'G'],
  priceRange: { minCents: 8900, maxCents: 45900 },
};

type Handler = (url: URL) => unknown;

/**
 * Substitui o fetch global por respostas falsas, escolhidas pelo caminho da URL.
 * Retorna o mock para conferir quais URLs foram chamadas.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const handler = handlers[url.pathname];
    if (!handler) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } },
        { status: 404 },
      );
    }
    return Response.json(handler(url));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function productList(products: ProductSummary[], page = 1, totalPages = 1) {
  return {
    data: products,
    meta: { page, pageSize: 12, total: products.length, totalPages },
  };
}
