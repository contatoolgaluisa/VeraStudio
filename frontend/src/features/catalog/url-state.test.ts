import { describe, expect, it } from 'vitest';
import { pageWindow } from './pagination';
import { readCatalogUrl, toProductQuery, writeCatalogUrl } from './url-state';

describe('estado do catálogo na URL', () => {
  it('lê filtros em português e preços em reais', () => {
    const state = readCatalogUrl(
      new URLSearchParams('tamanhos=P,M&cores=Preto&precoMin=100&ordem=menor-preco&pagina=2'),
    );

    expect(state).toEqual({
      q: '',
      sizes: ['P', 'M'],
      colors: ['Preto'],
      minPrice: 100,
      maxPrice: undefined,
      sort: 'price_asc',
      page: 2,
    });
  });

  it('ignora valores inválidos em vez de quebrar a página', () => {
    const state = readCatalogUrl(new URLSearchParams('precoMin=abc&ordem=aleatoria&pagina=-3'));

    expect(state.minPrice).toBeUndefined();
    expect(state.sort).toBe('newest');
    expect(state.page).toBe(1);
  });

  it('escreve só o que difere do padrão, para URLs curtas', () => {
    const params = writeCatalogUrl({
      q: '',
      sizes: [],
      colors: ['Areia'],
      sort: 'newest',
      page: 1,
    });

    expect(params.toString()).toBe('cores=Areia');
  });

  it('converte reais para centavos ao montar a consulta da API', () => {
    const query = toProductQuery(
      { q: 'linho', sizes: [], colors: [], minPrice: 50, maxPrice: 200, sort: 'newest', page: 1 },
      12,
    );

    expect(query).toMatchObject({ q: 'linho', minPrice: 5000, maxPrice: 20000, pageSize: 12 });
  });
});

describe('pageWindow', () => {
  it('mostra todas as páginas quando são poucas', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });

  it('resume com reticências quando são muitas', () => {
    expect(pageWindow(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
  });
});
