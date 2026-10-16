import { describe, expect, it } from 'vitest';
import { sortSizes } from '../src/modules/catalog/sizes.js';

describe('sortSizes', () => {
  it('ordena tamanhos de roupa na ordem natural, não alfabética', () => {
    expect(sortSizes(['G', 'P', 'GG', 'M', 'PP'])).toEqual(['PP', 'P', 'M', 'G', 'GG']);
  });

  it('ordena numeração e remove repetidos', () => {
    expect(sortSizes(['44', '38', '40', '38'])).toEqual(['38', '40', '44']);
  });

  it('coloca tamanhos desconhecidos no final', () => {
    expect(sortSizes(['Infantil', 'M', 'U'])).toEqual(['M', 'U', 'Infantil']);
  });
});
