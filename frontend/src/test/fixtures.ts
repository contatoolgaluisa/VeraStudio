import { vi } from 'vitest';
import type {
  Category,
  FilterOptions,
  ProductDetail,
  ProductSummary,
} from '@/features/catalog/types';

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

/**
 * Produto com uma situação de estoque variada, para testar a seleção:
 * Preto: P (2 un.) e M (esgotado). Branco: só M (5 un.). Areia: G (esgotado).
 */
export function makeProductDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'detalhe-1',
    slug: 'camiseta-teste',
    name: 'Camiseta Teste',
    category: { slug: 'feminino', name: 'Feminino' },
    priceCents: 12900,
    compareAtPriceCents: null,
    isOnSale: false,
    discountPercent: null,
    isNew: false,
    description: 'Camiseta de algodão para testes.',
    images: [],
    colors: [
      { name: 'Areia', hex: '#D8C8A8' },
      { name: 'Branco', hex: '#F7F6F2' },
      { name: 'Preto', hex: '#151515' },
    ],
    sizes: ['P', 'M', 'G'],
    inStock: true,
    variants: [
      variant('T-ARE-G', 'Areia', '#D8C8A8', 'G', 0),
      variant('T-BRA-M', 'Branco', '#F7F6F2', 'M', 5),
      variant('T-PRE-P', 'Preto', '#151515', 'P', 2),
      variant('T-PRE-M', 'Preto', '#151515', 'M', 0),
    ],
    ...overrides,
  };
}

function variant(sku: string, color: string, colorHex: string, size: string, stock: number) {
  return { id: sku, sku, color, colorHex, size, available: stock > 0, maxQuantity: stock };
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
