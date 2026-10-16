import type { ProductQuery, SortOption } from './types';

/**
 * Os filtros do catálogo vivem na URL (ex.: /loja/feminino?tamanhos=M&ordem=menor-preco).
 *
 * Vantagens: o link pode ser compartilhado, o botão "voltar" do navegador
 * desfaz o último filtro e recarregar a página não perde nada.
 *
 * A URL usa nomes em português e preços em REAIS (mais legível);
 * a API recebe nomes em inglês e preços em CENTAVOS.
 */

export const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Mais recentes',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
};

const SORT_TO_URL: Record<SortOption, string> = {
  newest: 'recentes',
  price_asc: 'menor-preco',
  price_desc: 'maior-preco',
};

const URL_TO_SORT = Object.fromEntries(
  Object.entries(SORT_TO_URL).map(([sort, url]) => [url, sort as SortOption]),
);

export interface CatalogUrlState {
  q: string;
  sizes: string[];
  colors: string[];
  minPrice?: number; // reais
  maxPrice?: number; // reais
  sort: SortOption;
  page: number;
}

function list(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : [];
}

function wholeNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function readCatalogUrl(params: URLSearchParams): CatalogUrlState {
  const page = wholeNumber(params.get('pagina'));
  return {
    q: params.get('q')?.trim() ?? '',
    sizes: list(params.get('tamanhos')),
    colors: list(params.get('cores')),
    minPrice: wholeNumber(params.get('precoMin')),
    maxPrice: wholeNumber(params.get('precoMax')),
    sort: URL_TO_SORT[params.get('ordem') ?? ''] ?? 'newest',
    page: page && page > 0 ? page : 1,
  };
}

export function writeCatalogUrl(state: CatalogUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.sizes.length) params.set('tamanhos', state.sizes.join(','));
  if (state.colors.length) params.set('cores', state.colors.join(','));
  if (state.minPrice !== undefined) params.set('precoMin', String(state.minPrice));
  if (state.maxPrice !== undefined) params.set('precoMax', String(state.maxPrice));
  if (state.sort !== 'newest') params.set('ordem', SORT_TO_URL[state.sort]);
  if (state.page > 1) params.set('pagina', String(state.page));
  return params;
}

/** Converte o estado da URL nos parâmetros da API. */
export function toProductQuery(state: CatalogUrlState, pageSize: number): ProductQuery {
  return {
    q: state.q || undefined,
    sizes: state.sizes,
    colors: state.colors,
    minPrice: state.minPrice !== undefined ? state.minPrice * 100 : undefined,
    maxPrice: state.maxPrice !== undefined ? state.maxPrice * 100 : undefined,
    sort: state.sort,
    page: state.page,
    pageSize,
  };
}

export function hasActiveFilters(state: CatalogUrlState): boolean {
  return (
    state.sizes.length > 0 ||
    state.colors.length > 0 ||
    state.minPrice !== undefined ||
    state.maxPrice !== undefined
  );
}

export function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
