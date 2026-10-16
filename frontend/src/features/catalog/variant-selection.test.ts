import { describe, expect, it } from 'vitest';
import { makeProductDetail } from '@/test/fixtures';
import { colorHasStock, findVariant, initialColor, initialSize, sizeStatus } from './variant-selection';

// Preto: P (2 un.), M (esgotado). Branco: só M (5 un.). Areia: G esgotado.
const product = makeProductDetail();

describe('seleção de variação', () => {
  it('encontra a variação só com cor e tamanho escolhidos', () => {
    expect(findVariant(product, 'Preto', 'P')?.sku).toBe('T-PRE-P');
    expect(findVariant(product, 'Preto', undefined)).toBeUndefined();
  });

  it('diferencia tamanho disponível, esgotado e inexistente na cor', () => {
    expect(sizeStatus(product, 'Preto', 'P')).toBe('available');
    expect(sizeStatus(product, 'Preto', 'M')).toBe('soldout');
    expect(sizeStatus(product, 'Branco', 'P')).toBe('nonexistent');
  });

  it('sabe se uma cor ainda tem algum tamanho à venda', () => {
    expect(colorHasStock(product, 'Branco')).toBe(true);
    expect(colorHasStock(product, 'Areia')).toBe(false);
  });

  it('começa pela cor da URL, se ela existir no produto', () => {
    expect(initialColor(product, 'Preto')).toBe('Preto');
    // Cor inexistente na URL: ignora e usa a primeira com estoque.
    expect(initialColor(product, 'Roxo')).toBe('Branco');
  });

  it('sem cor na URL, começa pela primeira cor com estoque', () => {
    // Areia vem primeiro em ordem alfabética, mas está esgotada.
    expect(initialColor(product, null)).toBe('Branco');
  });

  it('pré-seleciona o tamanho só quando ele é único', () => {
    expect(initialSize(product)).toBeUndefined();
    expect(initialSize(makeProductDetail({ sizes: ['U'] }))).toBe('U');
  });
});
